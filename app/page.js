'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const STATUS_COLORS = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  neutral: '#6b7280',
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const STATUS_CODE_REF = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 408: 'Request Timeout',
  429: 'Too Many Requests', 500: 'Internal Server Error',
  502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
};

const SAMPLE_SCHEMAS = {
  basic: '{\n  "type": "object",\n  "required": ["id", "name"],\n  "properties": {\n    "id": { "type": "number" },\n    "name": { "type": "string" }\n  }\n}',
  array: '{\n  "type": "array",\n  "items": {\n    "type": "object",\n    "required": ["id"],\n    "properties": {\n      "id": { "type": "number" }\n    }\n  }\n}',
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusColor(code) {
  if (code >= 200 && code < 300) return STATUS_COLORS.success;
  if (code >= 300 && code < 400) return STATUS_COLORS.warning;
  if (code >= 400 && code < 500) return STATUS_COLORS.error;
  if (code >= 500) return STATUS_COLORS.error;
  return STATUS_COLORS.neutral;
}

function jsonSyntaxHighlight(json) {
  if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="$${cls}">$${match}</span>`;
    }
  );
}

// Simple JSON Schema validator
function validateSchema(data, schema) {
  const errors = [];
  try {
    const s = typeof schema === 'string' ? JSON.parse(schema) : schema;
    _validateNode(data, s, '', errors);
  } catch (e) {
    errors.push({ path: '', message: `Schema parse error: ${e.message}` });
  }
  return errors;
}

function _validateNode(data, schema, path, errors) {
  if (!schema) return;
  if (schema.type) {
    const actual = Array.isArray(data) ? 'array' : typeof data;
    if (schema.type === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        errors.push({ path: path || '(root)', message: `Expected integer, got ${actual}` });
      }
    } else if (actual !== schema.type) {
      errors.push({ path: path || '(root)', message: `Expected $${schema.type}, got $${actual}` });
      return;
    }
  }
  if (schema.required && schema.type === 'object' && typeof data === 'object' && data !== null) {
    for (const key of schema.required) {
      if (!(key in data)) {
        errors.push({ path: `$${path}.$${key}`, message: `Missing required field "${key}"` });
      }
    }
  }
  if (schema.properties && typeof data === 'object' && data !== null) {
    for (const [key, subSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        _validateNode(data[key], subSchema, `$${path}.$${key}`, errors);
      }
    }
  }
  if (schema.items && Array.isArray(data)) {
    data.forEach((item, i) => _validateNode(item, schema.items, `$${path}[$${i}]`, errors));
  }
}

// ============================================================
// CUSTOM HOOKS
// ============================================================
function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(initialValue);
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setStored(JSON.parse(item));
    } catch (e) { /* ignore */ }
  }, [key]);

  const setValue = (value) => {
    setStored(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* ignore */ }
  };
  return [stored, setValue];
}

function usePolling(callback, interval, enabled) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.

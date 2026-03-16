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
      return `<span class="${cls}">${match}</span>`;
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
      errors.push({ path: path || '(root)', message: `Expected ${schema.type}, got ${actual}` });
      return;
    }
  }
  if (schema.required && schema.type === 'object' && typeof data === 'object' && data !== null) {
    for (const key of schema.required) {
      if (!(key in data)) {
        errors.push({ path: `${path}.${key}`, message: `Missing required field "${key}"` });
      }
    }
  }
  if (schema.properties && typeof data === 'object' && data !== null) {
    for (const [key, subSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        _validateNode(data[key], subSchema, `${path}.${key}`, errors);
      }
    }
  }
  if (schema.items && Array.isArray(data)) {
    data.forEach((item, i) => _validateNode(item, schema.items, `${path}[${i}]`, errors));
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
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (!enabled || !interval) return;
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// --- Toast Notifications ---
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// --- Tabs ---
function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${active === tab.id ? 'tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}

// --- Key-Value Editor ---
function KeyValueEditor({ items, onChange, placeholder = { key: 'Key', value: 'Value' } }) {
  const addRow = () => onChange([...items, { key: '', value: '', enabled: true, id: generateId() }]);
  const updateRow = (id, field, val) =>
    onChange(items.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const removeRow = (id) => onChange(items.filter((r) => r.id !== id));

  return (
    <div className="kv-editor">
      {items.map((row) => (
        <div key={row.id} className="kv-row">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => updateRow(row.id, 'enabled', e.target.checked)}
          />
          <input
            className="kv-input"
            placeholder={placeholder.key}
            value={row.key}
            onChange={(e) => updateRow(row.id, 'key', e.target.value)}
          />
          <input
            className="kv-input"
            placeholder={placeholder.value}
            value={row.value}
            onChange={(e) => updateRow(row.id, 'value', e.target.value)}
          />
          <button className="kv-remove" onClick={() => removeRow(row.id)}>×</button>
        </div>
      ))}
      <button className="kv-add" onClick={addRow}>+ Add Row</button>
    </div>
  );
}

// --- Mini Sparkline Chart ---
function Sparkline({ data, width = 200, height = 40, color = '#3b82f6' }) {
  if (!data || data.length < 2) return <div className="sparkline-empty">No data yet</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const lastVal = data[data.length - 1];
  const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(0);

  return (
    <div className="sparkline-wrap">
      <svg width={width} height={height} className="sparkline-svg">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points.join(' ')} />
        <circle
          cx={(data.length - 1) / (data.length - 1) * width}
          cy={height - ((lastVal - min) / range) * (height - 4) - 2}
          r="3" fill={color}
        />
      </svg>
      <div className="sparkline-stats">
        <span>Last: {formatDuration(lastVal)}</span>
        <span>Avg: {formatDuration(Number(avg))}</span>
        <span>Min: {formatDuration(min)}</span>
        <span>Max: {formatDuration(max)}</span>
      </div>
    </div>
  );
}

// --- Response Diff Viewer ---
function DiffViewer({ left, right }) {
  const leftLines = (left || '').split('\n');
  const rightLines = (right || '').split('\n');
  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span>Response A</span>
        <span>Response B</span>
      </div>
      <div className="diff-body">
        {Array.from({ length: maxLen }).map((_, i) => {
          const l = leftLines[i] || '';
          const r = rightLines[i] || '';
          const isDiff = l !== r;
          return (
            <div key={i} className={`diff-row ${isDiff ? 'diff-changed' : ''}`}>
              <span className="diff-line-num">{i + 1}</span>
              <pre className="diff-cell">{l}</pre>
              <span className="diff-divider">{isDiff ? '≠' : '='}</span>
              <pre className="diff-cell">{r}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- cURL Generator ---
function CurlGenerator({ method, url, headers, body }) {
  const parts = [`curl -X ${method} '${url}'`];
  if (headers) {
    headers.filter((h) => h.enabled && h.key).forEach((h) => {
      parts.push(`  -H '${h.key}: ${h.value}'`);
    });
  }
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    parts.push(`  -d '${body}'`);
  }
  const cmd = parts.join(' \\\n');

  return (
    <div className="curl-gen">
      <div className="curl-header">
        <span>📋 cURL Command</span>
        <button
          className="btn-sm"
          onClick={() => { navigator.clipboard.writeText(cmd); }}
        >
          Copy
        </button>
      </div>
      <pre className="curl-code">{cmd}</pre>
    </div>
  );
}

// --- Status Code Reference Panel ---
function StatusCodeRef() {
  const [filter, setFilter] = useState('');
  const codes = Object.entries(STATUS_CODE_REF).filter(
    ([code, text]) => code.includes(filter) || text.toLowerCase().includes(filter.toLowerCase())
  );
  return (
    <div className="status-ref">
      <input
        className="status-ref-search"
        placeholder="Search status codes..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="status-ref-grid">
        {codes.map(([code, text]) => (
          <div
            key={code}
            className="status-ref-item"
            style={{ borderLeftColor: getStatusColor(Number(code)) }}
          >
            <strong>{code}</strong>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Environment Variable Manager ---
function EnvManager({ envSets, activeEnv, onSwitch, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');

  const addEnvSet = () => {
    if (!newName.trim()) return;
    onUpdate([...envSets, { name: newName.trim(), vars: [{ key: '', value: '', id: generateId() }] }]);
    setNewName('');
  };

  return (
    <div className="env-manager">
      <div className="env-header">
        <h3>🔐 Environments</h3>
        <select value={activeEnv} onChange={(e) => onSwitch(Number(e.target.value))}>
          {envSets.map((env, i) => (
            <option key={i} value={i}>{env.name}</option>
          ))}
        </select>
        <button className="btn-sm" onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing && (
        <div className="env-edit">
          <div className="env-add-row">
            <input
              placeholder="New environment name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn-sm" onClick={addEnvSet}>Add</button>
          </div>
          {envSets[activeEnv] && (
            <KeyValueEditor
              items={envSets[activeEnv].vars}
              onChange={(vars) => {
                const updated = [...envSets];
                updated[activeEnv] = { ...updated[activeEnv], vars };
                onUpdate(updated);
              }}
              placeholder={{ key: 'Variable name', value: 'Variable value' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Home() {
  // --- Theme ---
  const [darkMode, setDarkMode] = useLocalStorage('spark-dark-mode', true);

  // --- Tabs ---
  const [activeTab, setActiveTab] = useState('builder');

  // --- Request Builder State ---
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [requestHeaders, setRequestHeaders] = useState([
    { key: 'Content-Type', value: 'application/json', enabled: true, id: generateId() },
  ]);
  const [requestParams, setRequestParams] = useState([
    { key: '', value: '', enabled: true, id: generateId() },
  ]);
  const [requestBody, setRequestBody] = useState('');
  const [bodyType, setBodyType] = useState('json'); // json, form, raw

  // --- Spark API Test (existing feature enhanced) ---
  const [sparkUrl, setSparkUrl] = useState('');
  const [sparkApiKey, setSparkApiKey] = useState('');
  const [sparkFields, setSparkFields] = useState(null);
  const [sparkTestResult, setSparkTestResult] = useState(null);

  // --- Response State ---
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);

  // --- History ---
  const [history, setHistory] = useLocalStorage('spark-history', []);

  // --- Favorites/Collections ---
  const [collections, setCollections] = useLocalStorage('spark-collections', [
    { name: 'Default', requests: [] },
  ]);
  const [activeCollection, setActiveCollection] = useState(0);

  // --- Environments ---
  const [envSets, setEnvSets] = useLocalStorage('spark-envs', [
    { name: 'Development', vars: [{ key: 'BASE_URL', value: 'http://localhost:3000', id: generateId() }] },
    { name: 'Production', vars: [{ key: 'BASE_URL', value: '', id: generateId() }] },
  ]);
  const [activeEnv, setActiveEnv] = useState(0);

  // --- Performance Tracking ---
  const [perfData, setPerfData] = useLocalStorage('spark-perf', {});

  // --- Diff Comparison ---
  const [diffA, setDiffA] = useState('');
  const [diffB, setDiffB] = useState('');

  // --- Schema Validation ---
  const [schema, setSchema] = useState(SAMPLE_SCHEMAS.basic);
  const [schemaErrors, setSchemaErrors] = useState([]);

  // --- Polling / Auto-refresh ---
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(30000);
  const [pollingUrl, setPollingUrl] = useState('');
  const [pollingResults, setPollingResults] = useState([]);

  // --- Batch Testing ---
  const [batchUrls, setBatchUrls] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);

  // --- Toasts ---
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // --- Environment variable substitution ---
  const resolveEnvVars = useCallback(
    (str) => {
      if (!str || !envSets[activeEnv]) return str;
      let result = str;
      envSets[activeEnv].vars.forEach((v) => {
        if (v.key) result = result.replaceAll(`{{${v.key}}}`, v.value);
      });
      return result;
    },
    [envSets, activeEnv]
  );

  // --- Build final URL with query params ---
  const buildUrl = useCallback(() => {
    let finalUrl = resolveEnvVars(url);
    const activeParams = requestParams.filter((p) => p.enabled && p.key);
    if (activeParams.length) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      const qs = activeParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(resolveEnvVars(p.value))}`).join('&');
      finalUrl += separator + qs;
    }
    return finalUrl;
  }, [url, requestParams, resolveEnvVars]);

  // ============================================================
  // API REQUEST HANDLER
  // ============================================================
  const sendRequest = async (overrideUrl, overrideMethod) => {
    const targetUrl = overrideUrl || buildUrl();
    const targetMethod = overrideMethod || method;

    if (!targetUrl) {
      addToast('Please enter a URL', 'warning');
      return null;
    }

    setLoading(true);
    setResponse(null);
    const startTime = performance.now();

    try {
      const headers = {};
      requestHeaders
        .filter((h) => h.enabled && h.key)
        .forEach((h) => { headers[resolveEnvVars(h.key)] = resolveEnvVars(h.value); });

      const fetchOpts = { method: targetMethod, headers };
      if (requestBody && ['POST', 'PUT', 'PATCH'].includes(targetMethod)) {
        fetchOpts.body = resolveEnvVars(requestBody);
      }

      // Use our proxy API to avoid CORS issues
      const proxyResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          method: targetMethod,
          headers,
          body: fetchOpts.body || null,
        }),
      });

      const elapsed = Math.round(performance.now() - startTime);
      const result = await proxyResponse.json();

      const responseData = {
        status: result.status || proxyResponse.status,
        statusText: result.statusText || proxyResponse.statusText,
        headers: result.headers || {},
        data: result.data,
        time: elapsed,
        size: JSON.stringify(result.data || '').length,
        timestamp: new Date().toISOString(),
        url: targetUrl,
        method: targetMethod,
      };

      setResponse(responseData);
      setResponseTime(elapsed);

      // Track perf data
      const urlKey = targetUrl.split('?')[0];
      setPerfData((prev) => {
        const existing = prev[urlKey] || [];
        return { ...prev, [urlKey]: [...existing.slice(-49), elapsed] };
      });

      // Add to history
      const historyEntry = {
        id: generateId(),
        ...responseData,
        requestHeaders: requestHeaders.filter((h) => h.enabled && h.key),
        requestBody,
      };
      setHistory((prev) => [historyEntry, ...prev.slice(0, 99)]);

      addToast(`${targetMethod} ${result.status} - ${formatDuration(elapsed)}`, result.status < 400 ? 'success' : 'error');
      setLoading(false);
      return responseData;
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      const errorResponse = {
        status: 0,
        statusText: 'Network Error',
        data: { error: err.message },
        time: elapsed,
        size: 0,
        timestamp: new Date().toISOString(),
        url: targetUrl,
        method: targetMethod,
      };
      setResponse(errorResponse);
      setResponseTime(elapsed);
      addToast(`Request failed: ${err.message}`, 'error');
      setLoading(false);
      return errorResponse;
    }
  };

  // ============================================================
  // SPARK-SPECIFIC TESTS
  // ============================================================
  const testSparkConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spark-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sparkUrl, apiKey: sparkApiKey }),
      });
      const data = await res.json();
      setSparkTestResult(data);
      addToast(data.success ? 'Spark connection successful!' : 'Spark connection failed', data.success ? 'success' : 'error');
    } catch (err) {
      setSparkTestResult({ success: false, error: err.message });
      addToast('Spark test failed', 'error');
    }
    setLoading(false);
  };

  const fetchSparkFields = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spark-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sparkUrl, apiKey: sparkApiKey }),
      });
      const data = await res.json();
      setSparkFields(data);
      addToast('Spark fields loaded!', 'success');
    } catch (err) {
      addToast('Failed to load Spark fields', 'error');
    }
    setLoading(false);
  };

  // ============================================================
  // BATCH TESTING
  // ============================================================
  const runBatchTest = async () => {
    const urls = batchUrls.split('\n').map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return addToast('Enter at least one URL', 'warning');

    setBatchRunning(true);
    setBatchResults([]);
    const results = [];

    for (const testUrl of urls) {
      const resolved = resolveEnvVars(testUrl);
      const start = performance.now();
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: resolved, method: 'GET', headers: {}, body: null }),
        });
        const data = await res.json();
        const elapsed = Math.round(performance.now() - start);
        results.push({ url: resolved, status: data.status, time: elapsed, ok: data.status < 400 });
      } catch (err) {
        results.push({ url: resolved, status: 0, time: Math.round(performance.now() - start), ok: false, error: err.message });
      }
      setBatchResults([...results]);
    }

    setBatchRunning(false);
    const passed = results.filter((r) => r.ok).length;
    addToast(`Batch complete: ${passed}/${results.length} passed`, passed === results.length ? 'success' : 'warning');
  };

  // ============================================================
  // POLLING
  // ============================================================
  usePolling(
    async () => {
      if (!pollingUrl) return;
      const resolved = resolveEnvVars(pollingUrl);
      const start = performance.now();
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: resolved, method: 'GET', headers: {}, body: null }),
        });
        const data = await res.json();
        const elapsed = Math.round(performance.now() - start);
        setPollingResults((prev) => [
          { timestamp: new Date().toISOString(), status: data.status, time: elapsed, ok: data.status < 400 },
          ...prev.slice(0, 49),
        ]);
      } catch (err) {
        setPollingResults((prev) => [
          { timestamp: new Date().toISOString(), status: 0, time: 0, ok: false, error: err.message },
          ...prev.slice(0, 49),
        ]);
      }
    },
    pollingInterval,
    pollingEnabled
  );

  // ============================================================
  // SCHEMA VALIDATION
  // ============================================================
  const runSchemaValidation = () => {
    if (!response?.data) return addToast('No response to validate', 'warning');
    const errors = validateSchema(response.data, schema);
    setSchemaErrors(errors);
    addToast(errors.length === 0 ? 'Schema valid ✓' : `${errors.length} validation error(s)`, errors.length === 0 ? 'success' : 'error');
  };

  // ============================================================
  // EXPORT
  // ============================================================
  const exportResults = (format) => {
    if (!response) return addToast('No response to export', 'warning');
    let content, filename, mime;

    if (format === 'json') {
      content = JSON.stringify(response, null, 2);
      filename = 'api-response.json';
      mime = 'application/json';
    } else if (format === 'csv') {
      const flat = flattenObject(response.data);
      const headers = Object.keys(flat);
      content = headers.join(',') + '\n' + headers.map((h) => JSON.stringify(flat[h] ?? '')).join(',');
      filename = 'api-response.csv';
      mime = 'text/csv';
    } else if (format === 'har') {
      const har = {
        log: {
          version: '1.2',
          entries: [{
            startedDateTime: response.timestamp,
            time: response.time,
            request: { method: response.method, url: response.url },
            response: { status: response.status, content: { text: JSON.stringify(response.data) } },
          }],
        },
      };
      content = JSON.stringify(har, null, 2);
      filename = 'api-response.har';
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    addToast(`Exported as ${format.toUpperCase()}`, 'success');
  };

  function flattenObject(obj, prefix = '') {
    const result = {};
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key], fullKey));
      } else {
        result[fullKey] = obj[key];
      }
    }
    return result;
  }

  // --- Save to collection ---
  const saveToCollection = () => {
    const entry = {
      id: generateId(),
      name: `${method} ${url || 'Untitled'}`,
      method, url,
      headers: requestHeaders,
      params: requestParams,
      body: requestBody,
      bodyType,
      savedAt: new Date().toISOString(),
    };
    const updated = [...collections];
    updated[activeCollection] = {
      ...updated[activeCollection],
      requests: [...updated[activeCollection].requests, entry],
    };
    setCollections(updated);
    addToast('Saved to collection!', 'success');
  };

  // --- Load from collection ---
  const loadFromCollection = (req) => {
    setMethod(req.method || 'GET');
    setUrl(req.url || '');
    setRequestHeaders(req.headers || []);
    setRequestParams(req.params || []);
    setRequestBody(req.body || '');
    setBodyType(req.bodyType || 'json');
    setActiveTab('builder');
    addToast('Request loaded', 'info');
  };

  // --- Load from history ---
  const loadFromHistory = (entry) => {
    setMethod(entry.method || 'GET');
    setUrl(entry.url || '');
    if (entry.requestHeaders) setRequestHeaders(entry.requestHeaders);
    if (entry.requestBody) setRequestBody(entry.requestBody);
    setActiveTab('builder');
    addToast('Loaded from history', 'info');
  };

  // ============================================================
  // TABS CONFIG
  // ============================================================
  const tabs = [
    { id: 'builder', label: 'Request Builder', icon: '🔨' },
    { id: 'spark', label: 'Spark Tester', icon: '⚡' },
    { id: 'batch', label: 'Batch Test', icon: '📦', badge: batchResults.length },
    { id: 'monitor', label: 'Monitor', icon: '📊' },
    { id: 'history', label: 'History', icon: '🕐', badge: history.length },
    { id: 'collections', label: 'Collections', icon: '⭐' },
    { id: 'diff', label: 'Diff', icon: '🔀' },
    { id: 'schema', label: 'Schema', icon: '✅' },
    { id: 'tools', label: 'Tools', icon: '🛠️' },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">⚡</span>
            Spark API Checker
            <span className="title-version">v2.0</span>
          </h1>
        </div>
        <div className="header-right">
          <EnvManager
            envSets={envSets}
            activeEnv={activeEnv}
            onSwitch={setActiveEnv}
            onUpdate={setEnvSets}
          />
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ===== TAB BAR ===== */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ===== MAIN CONTENT ===== */}
      <main className="app-main">
        {/* ---------- REQUEST BUILDER ---------- */}
        {activeTab === 'builder' && (
          <div className="panel builder-panel">
            <div className="url-bar">
              <select className="method-select" value={method} onChange={(e) => setMethod(e.target.value)}
                style={{ backgroundColor: method === 'GET' ? '#10b981' : method === 'POST' ? '#3b82f6' : method === 'PUT' ? '#f59e0b' : method === 'DELETE' ? '#ef4444' : '#6b7280', color: '#fff' }}>
                {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                className="url-input"
                placeholder="Enter URL or use {{VARIABLE}} syntax..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
              />
              <button className="send-btn" onClick={() => sendRequest()} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Send'}
              </button>
              <button className="btn-icon" onClick={saveToCollection} title="Save to collection">⭐</button>
            </div>

            <div className="builder-sections">
              <details className="builder-section" open>
                <summary>Query Parameters</summary>
                <KeyValueEditor items={requestParams} onChange={setRequestParams} />
              </details>

              <details className="builder-section" open>
                <summary>Headers</summary>
                <KeyValueEditor items={requestHeaders} onChange={setRequestHeaders} />
              </details>

              <details className="builder-section">
                <summary>Body</summary>
                <div className="body-type-bar">
                  {['json', 'form', 'raw'].map((t) => (
                    <button key={t} className={`body-type-btn ${bodyType === t ? 'active' : ''}`}
                      onClick={() => setBodyType(t)}>{t.toUpperCase()}</button>
                  ))}
                </div>
                <textarea
                  className="body-editor"
                  placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'key=value&key2=value2'}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={8}
                />
              </details>
            </div>

            {/* ===== RESPONSE ===== */}
            {response && (
              <div className="response-panel">
                <div className="response-header">
                  <div className="response-status" style={{ color: getStatusColor(response.status) }}>
                    <span className="status-dot" style={{ backgroundColor: getStatusColor(response.status) }} />
                    <strong>{response.status}</strong>
                    <span>{STATUS_CODE_REF[response.status] || response.statusText}</span>
                  </div>
                  <div className="response-meta">
                    <span className="meta-chip">⏱ {formatDuration(response.time)}</span>
                    <span className="meta-chip">📦 {formatBytes(response.size)}</span>
                    <span className="meta-chip">🕐 {new Date(response.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="response-actions">
                    <button className="btn-sm" onClick={() => exportResults('json')}>Export JSON</button>
                    <button className="btn-sm" onClick={() => exportResults('csv')}>Export CSV</button>
                    <button className="btn-sm" onClick={() => exportResults('har')}>Export HAR</button>
                    <button className="btn-sm" onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
                      addToast('Copied to clipboard', 'success');
                    }}>Copy</button>
                    <button className="btn-sm" onClick={() => {
                      setDiffA(JSON.stringify(response.data, null, 2));
                      addToast('Set as Diff A', 'info');
                    }}>→ Diff A</button>
                    <button className="btn-sm" onClick={() => {
                      setDiffB(JSON.stringify(response.data, null, 2));
                      addToast('Set as Diff B', 'info');
                    }}>→ Diff B</button>
                  </div>
                </div>

                {/* Response Perf Graph */}
                {perfData[url?.split('?')[0]] && (
                  <div className="perf-mini">
                    <Sparkline data={perfData[url.split('?')[0]]} width={400} height={50} />
                  </div>
                )}

                {/* Response Headers */}
                {response.headers && Object.keys(response.headers).length > 0 && (
                  <details className="response-section">
                    <summary>Response Headers ({Object.keys(response.headers).length})</summary>
                    <div className="response-headers-grid">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="header-row">
                          <span className="header-key">{k}</span>
                          <span className="header-val">{v}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Response Body */}
                <details className="response-section" open>
                  <summary>Response Body</summary>
                  <pre className="response-body"
                    dangerouslySetInnerHTML={{
                      __html: jsonSyntaxHighlight(JSON.stringify(response.data, null, 2))
                    }}
                  />
                </details>

                {/* cURL */}
                <details className="response-section">
                  <summary>cURL Command</summary>
                  <CurlGenerator method={method} url={buildUrl()} headers={requestHeaders} body={requestBody} />
                </details>
              </div>
            )}
          </div>
        )}

        {/* ---------- SPARK TESTER ---------- */}
        {activeTab === 'spark' && (
          <div className="panel spark-panel">
            <h2>⚡ Spark API Connection Tester</h2>
            <div className="spark-form">
              <div className="form-group">
                <label>Spark API URL</label>
                <input
                  className="form-input"
                  placeholder="https://your-spark-api.com/api/v1"
                  value={sparkUrl}
                  onChange={(e) => setSparkUrl(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter your API key"
                  value={sparkApiKey}
                  onChange={(e) => setSparkApiKey(e.target.value)}
                />
              </div>
              <div className="spark-actions">
                <button className="btn-primary" onClick={testSparkConnection} disabled={loading}>
                  {loading ? 'Testing...' : 'Test Connection'}
                </button>
                <button className="btn-secondary" onClick={fetchSparkFields} disabled={loading}>
                  {loading ? 'Loading...' : 'Fetch Fields'}
                </button>
              </div>
            </div>

            {sparkTestResult && (
              <div className={`spark-result ${sparkTestResult.success ? 'result-success' : 'result-error'}`}>
                <h3>{sparkTestResult.success ? '✓ Connection Successful' : '✕ Connection Failed'}</h3>
                <pre>{JSON.stringify(sparkTestResult, null, 2)}</pre>
              </div>
            )}

            {sparkFields && (
              <div className="spark-fields">
                <h3>📋 API Fields</h3>
                <pre className="response-body"
                  dangerouslySetInnerHTML={{ __html: jsonSyntaxHighlight(JSON.stringify(sparkFields, null, 2)) }}
                />
              </div>
            )}
          </div>
        )}

        {/* ---------- BATCH TEST ---------- */}
        {activeTab === 'batch' && (
          <div className="panel batch-panel">
            <h2>📦 Batch API Tester</h2>
            <p className="hint">Enter one URL per line. Use {`{{VARIABLE}}`} for environment variables.</p>
            <textarea
              className="batch-input"
              placeholder={"https://api.example.com/health\nhttps://api.example.com/status\n{{BASE_URL}}/api/v1/ping"}
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              rows={6}
            />
            <button className="btn-primary" onClick={runBatchTest} disabled={batchRunning}>
              {batchRunning ? `Running... (${batchResults.length}/${batchUrls.split('\n').filter(Boolean).length})` : 'Run Batch Test'}
            </button>

            {batchResults.length > 0 && (
              <div className="batch-results">
                <div className="batch-summary">
                  <span className="batch-stat pass">✓ {batchResults.filter((r) => r.ok).length} Passed</span>
                  <span className="batch-stat fail">✕ {batchResults.filter((r) => !r.ok).length} Failed</span>
                  <span className="batch-stat">⏱ Avg: {formatDuration(Math.round(batchResults.reduce((a, r) => a + r.time, 0) / batchResults.length))}</span>
                </div>
                <div className="batch-list">
                  {batchResults.map((r, i) => (
                    <div key={i} className={`batch-item ${r.ok ? 'batch-ok' : 'batch-fail'}`}>
                      <span className="batch-status" style={{ color: getStatusColor(r.status) }}>
                        {r.status || 'ERR'}
                      </span>
                      <span className="batch-url">{r.url}</span>
                      <span className="batch-time">{formatDuration(r.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- MONITOR ---------- */}
        {activeTab === 'monitor' && (
          <div className="panel monitor-panel">
            <h2>📊 API Monitor / Health Check</h2>
            <div className="monitor-config">
              <input
                className="form-input"
                placeholder="URL to monitor..."
                value={pollingUrl}
                onChange={(e) => setPollingUrl(e.target.value)}
              />
              <select className="form-select" value={pollingInterval} onChange={(e) => setPollingInterval(Number(e.target.value))}>
                <option value={5000}>Every 5s</option>
                <option value={10000}>Every 10s</option>
                <option value={30000}>Every 30s</option>
                <option value={60000}>Every 60s</option>
                <option value={300000}>Every 5m</option>
              </select>
              <button
                className={`btn-primary ${pollingEnabled ? 'btn-danger' : ''}`}
                onClick={() => setPollingEnabled(!pollingEnabled)}
              >
                {pollingEnabled ? '⏹ Stop' : '▶ Start'} Monitoring
              </button>
            </div>

            {pollingEnabled && <div className="pulse-indicator"><span className="pulse-dot" /> Live</div>}

            {pollingResults.length > 0 && (
              <>
                <div className="monitor-chart">
                  <Sparkline
                    data={pollingResults.map((r) => r.time).reverse()}
                    width={600}
                    height={80}
                    color={pollingResults[0]?.ok ? '#10b981' : '#ef4444'}
                  />
                </div>

                <div className="monitor-uptime">
                  <span>Uptime: {((pollingResults.filter((r) => r.ok).length / pollingResults.length) * 100).toFixed(1)}%</span>
                  <span>Checks: {pollingResults.length}</span>
                </div>

                <div className="monitor-log">
                  {pollingResults.map((r, i) => (
                    <div key={i} className={`monitor-entry ${r.ok ? 'entry-ok' : 'entry-fail'}`}>
                      <span className="monitor-time">{new Date(r.timestamp).toLocaleTimeString()}</span>
                      <span className="monitor-status" style={{ color: getStatusColor(r.status) }}>{r.status || 'ERR'}</span>
                      <span>{formatDuration(r.time)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Performance History */}
            <h3 style={{ marginTop: '2rem' }}>📈 Performance History</h3>
            {Object.entries(perfData).length === 0 ? (
              <p className="hint">Make some requests to see performance data.</p>
            ) : (
              Object.entries(perfData).map(([urlKey, data]) => (
                <div key={urlKey} className="perf-card">
                  <h4>{urlKey}</h4>
                  <Sparkline data={data} width={500} height={60} />
                </div>
              ))
            )}
          </div>
        )}

        {/* ---------- HISTORY ---------- */}
        {activeTab === 'history' && (
          <div className="panel history-panel">
            <div className="history-header">
              <h2>🕐 Request History</h2>
              <button className="btn-sm btn-danger" onClick={() => { setHistory([]); addToast('History cleared', 'info'); }}>
                Clear All
              </button>
            </div>
            {history.length === 0 ? (
              <p className="empty-state">No requests yet. Start making API calls!</p>
            ) : (
              <div className="history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="history-item" onClick={() => loadFromHistory(entry)}>
                    <div className="history-method" style={{ color: entry.method === 'GET' ? '#10b981' : entry.method === 'POST' ? '#3b82f6' : '#f59e0b' }}>
                      {entry.method}
                    </div>
                    <div className="history-info">
                      <span className="history-url">{entry.url}</span>
                      <span className="history-meta">
                        <span style={{ color: getStatusColor(entry.status) }}>{entry.status}</span>
                        {' · '}{formatDuration(entry.time)}
                        {' · '}{new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="history-status-dot" style={{ backgroundColor: getStatusColor(entry.status) }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- COLLECTIONS ---------- */}
        {activeTab === 'collections' && (
          <div className="panel collections-panel">
            <h2>⭐ Collections</h2>
            <div className="collections-tabs">
              {collections.map((col, i) => (
                <button key={i} className={`btn-sm ${activeCollection === i ? 'active' : ''}`}
                  onClick={() => setActiveCollection(i)}>
                  {col.name} ({col.requests.length})
                </button>
              ))}
              <button className="btn-sm" onClick={() => {
                const name = prompt('Collection name:');
                if (name) setCollections([...collections, { name, requests: [] }]);
              }}>+ New</button>
            </div>

            {collections[activeCollection]?.requests.length === 0 ? (
              <p className="empty-state">No saved requests. Use the ⭐ button to save.</p>
            ) : (
              <div className="collection-list">
                {collections[activeCollection]?.requests.map((req) => (
                  <div key={req.id} className="collection-item">
                    <span className="collection-method" style={{ color: req.method === 'GET' ? '#10b981' : '#3b82f6' }}>
                      {req.method}
                    </span>
                    <span className="collection-url">{req.url}</span>
                    <div className="collection-actions">
                      <button className="btn-sm" onClick={() => loadFromCollection(req)}>Load</button>
                      <button className="btn-sm btn-danger" onClick={() => {
                        const updated = [...collections];
                        updated[activeCollection] = {
                          ...updated[activeCollection],
                          requests: updated[activeCollection].requests.filter((r) => r.id !== req.id),
                        };
                        setCollections(updated);
                      }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- DIFF ---------- */}
        {activeTab === 'diff' && (
          <div className="panel diff-panel">
            <h2>🔀 Response Diff Comparison</h2>
            <p className="hint">Compare two API responses side-by-side. Use &quot;→ Diff A/B&quot; buttons from response panel.</p>
            <div className="diff-inputs">
              <div className="diff-input-group">
                <label>Response A</label>
                <textarea value={diffA} onChange={(e) => setDiffA(e.target.value)} rows={6}
                  placeholder="Paste or send response to Diff A..." />
              </div>
              <div className="diff-input-group">
                <label>Response B</label>
                <textarea value={diffB} onChange={(e) => setDiffB(e.target.value)} rows={6}
                  placeholder="Paste or send response to Diff B..." />
              </div>
            </div>
            {diffA && diffB && <DiffViewer left={diffA} right={diffB} />}
          </div>
        )}

        {/* ---------- SCHEMA VALIDATOR ---------- */}
        {activeTab === 'schema' && (
          <div className="panel schema-panel">
            <h2>✅ JSON Schema Validator</h2>
            <p className="hint">Define a JSON schema and validate the latest API response against it.</p>
            <div className="schema-presets">
              <span>Presets:</span>
              {Object.entries(SAMPLE_SCHEMAS).map(([name, s]) => (
                <button key={name} className="btn-sm" onClick={() => setSchema(s)}>{name}</button>
              ))}
            </div>
            <textarea
              className="schema-editor"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              rows={10}
              placeholder="Enter JSON Schema..."
            />
            <button className="btn-primary" onClick={runSchemaValidation}>Validate Response</button>

            {schemaErrors.length > 0 ? (
              <div className="schema-errors">
                <h3>❌ Validation Errors ({schemaErrors.length})</h3>
                {schemaErrors.map((err, i) => (
                  <div key={i} className="schema-error-item">
                    <code>{err.path}</code>: {err.message}
                  </div>
                ))}
              </div>
            ) : schemaErrors !== null && response ? (
              <div className="schema-valid">✓ Response matches schema</div>
            ) : null}
          </div>
        )}

        {/* ---------- TOOLS ---------- */}
        {activeTab === 'tools' && (
          <div className="panel tools-panel">
            <h2>🛠️ Developer Tools</h2>

            <div className="tools-grid">
              {/* Status Code Reference */}
              <div className="tool-card">
                <h3>HTTP Status Codes</h3>
                <StatusCodeRef />
              </div>

              {/* JSON Formatter */}
              <div className="tool-card">
                <h3>JSON Formatter</h3>
                <JsonFormatter />
              </div>

              {/* Base64 Encoder/Decoder */}
              <div className="tool-card">
                <h3>Base64 Encode/Decode</h3>
                <Base64Tool addToast={addToast} />
              </div>

              {/* URL Encoder/Decoder */}
              <div className="tool-card">
                <h3>URL Encode/Decode</h3>
                <UrlEncodeTool addToast={addToast} />
              </div>

              {/* JWT Decoder */}
              <div className="tool-card">
                <h3>JWT Decoder</h3>
                <JwtDecoder addToast={addToast} />
              </div>

              {/* Timestamp Converter */}
              <div className="tool-card">
                <h3>Timestamp Converter</h3>
                <TimestampTool />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// TOOL COMPONENTS
// ============================================================

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const format = () => {
    try {
      setOutput(JSON.stringify(JSON.parse(input), null, 2));
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    }
  };

  const minify = () => {
    try {
      setOutput(JSON.stringify(JSON.parse(input)));
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    }
  };

  return (
    <div className="tool-inner">
      <textarea placeholder="Paste JSON..." value={input} onChange={(e) => setInput(e.target.value)} rows={4} />
      <div className="tool-btns">
        <button className="btn-sm" onClick={format}>Format</button>
        <button className="btn-sm" onClick={minify}>Minify</button>
      </div>
      {output && <pre className="tool-output">{output}</pre>}
    </div>
  );
}

function Base64Tool({ addToast }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  return (
    <div className="tool-inner">
      <textarea placeholder="Enter text..." value={input} onChange={(e) => setInput(e.target.value)} rows={3} />
      <div className="tool-btns">
        <button className="btn-sm" onClick={() => { try { setOutput(btoa(input)); } catch (e) { setOutput('Error'); } }}>Encode</button>
        <button className="btn-sm" onClick={() => { try { setOutput(atob(input)); } catch (e) { setOutput('Error'); } }}>Decode</button>
        <button className="btn-sm" onClick={() => { navigator.clipboard.writeText(output); addToast('Copied', 'success'); }}>Copy</button>
      </div>
      {output && <pre className="tool-output">{output}</pre>}
    </div>
  );
}

function UrlEncodeTool({ addToast }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  return (
    <div className="tool-inner">
      <textarea placeholder="Enter URL or text..." value={input} onChange={(e) => setInput(e.target.value)} rows={3} />
      <div className="tool-btns">
        <button className="btn-sm" onClick={() => setOutput(encodeURIComponent(input))}>Encode</button>
        <button className="btn-sm" onClick={() => { try { setOutput(decodeURIComponent(input)); } catch { setOutput('Error'); } }}>Decode</button>
        <button className="btn-sm" onClick={() => { navigator.clipboard.writeText(output); addToast('Copied', 'success'); }}>Copy</button>
      </div>
      {output && <pre className="tool-output">{output}</pre>}
    </div>
  );
}

function JwtDecoder({ addToast }) {
  const [input, setInput] = useState('');
  const [decoded, setDecoded] = useState(null);

  const decode = () => {
    try {
      const parts = input.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT');
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      setDecoded({ header, payload });
    } catch (e) {
      setDecoded({ error: e.message });
    }
  };

  return (
    <div className="tool-inner">
      <textarea placeholder="Paste JWT token..." value={input} onChange={(e) => setInput(e.target.value)} rows={3} />
      <button className="btn-sm" onClick={decode}>Decode</button>
      {decoded && (
        <pre className="tool-output">{JSON.stringify(decoded, null, 2)}</pre>
      )}
    </div>
  );
}

function TimestampTool() {
  const [ts, setTs] = useState(Math.floor(Date.now() / 1000).toString());
  const [date, setDate] = useState(new Date().toISOString());

  return (
    <div className="tool-inner">
      <div className="ts-row">
        <label>Unix Timestamp</label>
        <input value={ts} onChange={(e) => {
          setTs(e.target.value);
          try { setDate(new Date(Number(e.target.value) * 1000).toISOString()); } catch { }
        }} />
      </div>
      <div className="ts-row">
        <label>ISO Date</label>
        <input value={date} onChange={(e) => {
          setDate(e.target.value);
          try { setTs(Math.floor(new Date(e.target.value).getTime() / 1000).toString()); } catch { }
        }} />
      </div>
      <button className="btn-sm" onClick={() => {
        const now = Math.floor(Date.now() / 1000);
        setTs(now.toString());
        setDate(new Date().toISOString());
      }}>Now</button>
    </div>
  );
}

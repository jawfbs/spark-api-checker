"use client";

import { useState } from "react";

export default function Home() {
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "fail"
  const [detail, setDetail] = useState("");

  async function handleRun() {
    setStatus("loading");
    setDetail("");

    try {
      const res = await fetch("/api/spark-test", { cache: "no-store" });
      const data = await res.json();

      if (data.connected) {
        setStatus("success");
        setDetail(
          `Pulled live data from Spark API.\nTotal listings available: ${data.totalActiveListings}` +
            (data.sampleRecord
              ? `\nSample ListingId: ${
                  data.sampleRecord.ListingId ??
                  data.sampleRecord.Id ??
                  "N/A"
                }`
              : "")
        );
      } else {
        setStatus("fail");
        setDetail(
          data.error +
            (data.detail ? `\n${data.detail}` : "") +
            (data.httpStatus ? `\nHTTP ${data.httpStatus}` : "")
        );
      }
    } catch (err) {
      setStatus("fail");
      setDetail("Could not reach the API route. " + err.message);
    }
  }

  return (
    <div className="page-wrapper">
      <div className="card">
        <h1>Spark API Checker</h1>
        <p className="subtitle">
          Press <strong>Run</strong> to test your live connection to the Spark
          API by FBS (replication endpoint).
        </p>

        <button
          className="run-btn"
          onClick={handleRun}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <span className="spinner" />
              Testing…
            </>
          ) : (
            "Run"
          )}
        </button>

        {status === "success" && (
          <>
            <div className="result success">✅ Success</div>
            {detail && <p className="detail">{detail}</p>}
          </>
        )}

        {status === "fail" && (
          <>
            <div className="result fail">❌ Run Failed</div>
            {detail && <p className="detail">{detail}</p>}
          </>
        )}
      </div>

      <p className="footer">
        Powered by{" "}
        <a
          href="http://sparkplatform.com/docs/api_services/read_first"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spark API
        </a>{" "}
        &amp; deployed on{" "}
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel
        </a>
      </p>
    </div>
  );
}

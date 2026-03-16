import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spark Field Explorer",
  description: "Interactive field discovery tool for the Spark API by FBS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="orb-container">
          <div className="orb orb-blue" />
          <div className="orb orb-purple" />
          <div className="orb orb-green" />
        </div>
        <div className="grid-pattern" />
        <div className="scanlines" />
        {children}
      </body>
    </html>
  );
}

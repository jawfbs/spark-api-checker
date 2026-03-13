import "./globals.css";

export const metadata = {
  title: "Spark API Connection Checker",
  description:
    "Vercel template — tests live connectivity to the Spark API by FBS.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

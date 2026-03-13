import "./globals.css";

export const metadata = {
  title: "Spark Field Explorer",
  description:
    "Explore all publicly available fields from the Spark API by FBS in an interactive tree.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}

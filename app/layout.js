import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "Spark Listings",
  description: "Search and browse MLS listings via the Spark API by FBS.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeProvider>
          <NavBar />
          <main className="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

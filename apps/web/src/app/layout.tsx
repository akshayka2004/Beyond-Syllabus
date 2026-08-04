import type { Metadata } from "next";
import { Suspense } from "react";
import { Outfit, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DataProvider } from "@/contexts";
import { PwaRegister } from "@/components/PwaRegister";
import Loader from "@/components/Loader";

// by.html type: Outfit (display) + Inter (body). Nohemi, if its font files are
// added to public/fonts, wins via the CSS stack; otherwise Outfit shows.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});


export const metadata: Metadata = {
  title: {
    default: "Beyond Syllabus",
    template: "%s | Beyond Syllabus",
  },
  description:
    "Walk into class with questions worth asking. Brainstorm before class, build your question sheet, and track where you stand. Free and open source.",
  openGraph: {
    title: "Beyond Syllabus",
    description:
      "Your modern, AI-powered guide to the university curriculum. Explore subjects, understand modules, and unlock your potential.",
    siteName: "Beyond Syllabus",
    type: "website",
    images: ["/favicon.ico"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#6d28d9",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased ${outfit.variable} ${inter.variable} bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
            <DataProvider>
              <Suspense
              fallback={<Loader />}
            >
                {children}
              </Suspense>
            </DataProvider>
          <Toaster reverseOrder={true} position="top-center" />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}

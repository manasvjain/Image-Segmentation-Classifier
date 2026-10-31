import "./globals.css";

export const metadata = {
  title: "Aerial Image Segmentation",
  description: "Upload aerial imagery and get building, road and water segmentation in seconds.",
};

// Runs before first paint: picks the theme and marks JS as available, so reveal animations never hide content without it.
const bootScript = `var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";d.dataset.theme=t}catch(e){d.dataset.theme="dark"}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

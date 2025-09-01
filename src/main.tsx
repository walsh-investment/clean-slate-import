import { createRoot } from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import App from './App.tsx'
import './index.css'

if (typeof window !== 'undefined') {
  createRoot(document.getElementById("root")!).render(
    <PostHogProvider
      apiKey="phc_EaDoWprdjHB6Cm08jhTBFtKXhlcPNG9ht8vpwGe5JiV"
      options={{
        api_host: "https://us.i.posthog.com",
        capture_pageview: true,
        autocapture: false,
        disable_session_recording: false,
        persistence: "localStorage",
        enable_recording_console_log: false,
        debug: true,
      }}
    >
      <App />
    </PostHogProvider>
  );
}

# UX rule: built for people who have never used AI

The audience is a finance clerk, an HR generalist, a warehouse supervisor. Many are
anxious about AI and do not know where to start.

- Every workflow page must work in two clicks: "Use sample data" then "Run".
- Streaming output must be visible within a second (the mock streams in word chunks;
  the real provider streams tokens). Never show a spinner with no text for long.
- Show what the run cost the user in time saved, not in tokens. Tokens and USD are for
  the admin console only.
- Labels in plain language, no "prompt", "LLM", "token" on prospect pages. Buttons say
  what happens ("Chạy", "Dùng dữ liệu mẫu", "Đặt lịch trao đổi").
- Each result ends with a path to conversion: rate it, then "Want this for your team?".
- Errors are human and actionable ("Sandbox đã hết lượt chạy. Liên hệ chúng tôi.").
- Mobile first: cards stack, the chat fills the screen, buttons are at least 40px tall.
- Accessibility: labelled inputs (`Field` + `htmlFor`), `role="alert"` for errors,
  keyboard reachable modals (Escape closes), colour never the only signal.
- Demo mode is always labelled as demo. We never pretend simulated output is real AI.

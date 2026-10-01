<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Every /app page (Core and any workspace, current or future) renders inside `ModulePage` with `Panel` sections; page styling changes go into those shared components, never per page — keeps all screens identical.

- Self-Hosted default local AI engine is bundled llama.cpp run by the OpsqaiAi service behind one loopback OpenAI-compatible gateway (127.0.0.1:11440); Ollama stays a selectable alternative — one base URL keeps the app adapter unchanged.

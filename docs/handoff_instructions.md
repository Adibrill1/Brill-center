# Handoff Instructions for Claude Code
- **Language Support**: All UI strings must be internationalized. Do not hardcode.
- **XML Logic**: Wrap complex architectural decisions in <planning> tags before implementation.
- **Security**: Use secure API routes with JWT/Session validation.
- **Inventory**: Check `threshold` in `Inventory` table upon any usage report.
- **Idea Workflow**: The `Idea Orchestrator` must convert user input into structured JSON/XML before DB insertion.
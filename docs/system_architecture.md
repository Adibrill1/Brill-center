# System Architecture: Brill Center
- **Core Goal**: Bridging physical spaces with digital management and analog community protocols.
- **Languages**: Hebrew (Default), English (Extensible).
- **Components**:
    1. **Web App (Next.js/React)**: State-driven interface.
    2. **Brill Studio (Management Dashboard)**: Operator control center for inventory, treasury, and idea approval.
    3. **Cloud Bridge**: Secure API layer interacting with local Home Assistant/Hardware.
    4. **Mini-Agents (AI)**:
        - Idea Orchestrator (Facilitator agent for idea proposals).
        - Operator Assistant (Inventory management & Conflict resolution).
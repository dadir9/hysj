# 🤝 Claude Code TEAM Agents Guide

Du har nå **5 spesialiserte agenter som jobber sammen i samme team-sesjon** (ikke separate).

## Team Members

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        CLAUDE CODE TEAM                                    ║
├────────────────────────────────────────────────────────────────────────────┤
║                                                                            ║
║  🎨 Frontend Agent        ⚙️ Backend Agent      🔍 Research Agent          ║
║  UI/UX Developer          API/Security Eng.     Security Researcher        ║
║                                                                            ║
║  📊 Report Agent          🚀 Fullstack Dev                                ║
║  Quality Analyst          Lead Engineer                                    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## How Team Works

### Single Shared Chat Session
```
┌─────────────────────────────────────────────┐
│   TEAM CHAT SESSION (shared context)       │
├─────────────────────────────────────────────┤
│ Frontend: "UI har disse problemene..."     │
│ Backend:  "Sikkerhet: password issues..." │
│ Research: "Jeg fant kilder: bcrypt..."    │
│ Fullstack: "Vi implementerer slik..."      │
│ Report:   "Prioritert plan: 1,2,3..."     │
└─────────────────────────────────────────────┘
         ↓
    All see same context
    All build on each other
    Real collaboration
```

### No Separate Orchestration
❌ Old way: Each agent isolated, coordinator gathers responses
✅ **New way**: All in same chat, natural back-and-forth

## Running Team Session

```bash
# Run team analysis (all agenter i same chat)
npm run team

# Or individual agents (separate analysis)
npm run agent:frontend
npm run agent:backend
```

## Team Session Flow

When you run `npm run team`:

1. **Frontend Agent** starts
   - Analyzes UI/UX issues
   - Other agents see this in chat

2. **Backend Agent** responds
   - Sees Frontend's findings
   - Adds security analysis
   - Team sees both perspectives

3. **Research Agent** contributes
   - Searches web for solutions
   - References earlier findings
   - Adds source material

4. **Fullstack Developer** plans
   - Builds on all previous findings
   - Creates implementation strategy
   - Considers all perspectives

5. **Report Agent** finalizes
   - Summarizes everything
   - Prioritizes based on team input
   - Creates actionable plan

## Example Team Chat

```
Frontend Agent 🎨:
"Jeg fant disse UI-problemene:
❌ Form validation mangler
❌ Ingen loading states
⚠️ Dark mode 50%"

Backend Agent ⚙️:
"Frontendens funn er viktig, men sikkerhet først:
🔴 KRITISK: Passwords plaintext
🔴 KRITISK: Rate limiting disabled
Disse må fikses før andre issues."

Research Agent 🔍:
"Basert på backend sine funn, jeg søkte:
✓ bcrypt best practice
✓ OWASP Rate Limiting guide
✓ JWT refresh token pattern"

Fullstack Developer 🚀:
"Med alle perspektiver:
Uke 1: Bcrypt + rate limiting
Uke 2: Form validation + loading
Uke 3: Testing + deployment"

Report Agent 📊:
"FINAL PLAN:
P1: Passwords (security)
P2: Rate limiting (security)
P3: Form validation (UX)
..."
```

## Key Differences From Original

| Aspect | Individual Agents | Team Session |
|--------|------------------|--------------|
| Context | Isolated | **Shared** |
| Chat History | Per-agent | **Shared by all** |
| Collaboration | Sequential | **Real-time back-and-forth** |
| Response Build-up | Independent | **Each builds on others** |
| Execution | Parallel | **Sequential in chat** |

## Team Session Code Structure

```javascript
class TeamSession {
  // Shared team chat history
  teamChat = [];
  
  // All agents reference same context
  async agentSpeak(memberId, context) {
    // Agent responds in team context
    // Others see response
    // Can reference earlier statements
  }
  
  // Broadcast to whole team
  async broadcastToTeam(announcement) {
    // All agents see this
  }
}
```

## Using Team Session

### Basic Usage
```bash
npm run team
```

### In Code
```javascript
import { TeamSession } from './src/team-session.js';

const team = new TeamSession();

await team.runTeamAnalysis(appDescription);

const responses = team.agentResponses;
// Contains all agent responses from team chat
```

### Custom Team Analysis
```javascript
const team = new TeamSession();

// Frontend starts
await team.agentSpeak('frontend', 'Analyze UI');

// Backend responds seeing frontend's output
await team.agentSpeak('backend', 'Frontend found X, what about security?');

// Research adds findings
await team.agentSpeak('research', 'I found solutions for those issues');

// Etc...
```

## Team Advantages

✅ **Natural Collaboration** - Agents see each other's work
✅ **Context Awareness** - References to other findings
✅ **Efficient** - Avoid duplicating analysis
✅ **More Accurate** - Build on each perspective
✅ **Realistic Teamwork** - Like real dev team meeting

## Examples

### Frontend refers to Backend findings
```
Frontend: "I'll fix those form validation issues 
Backend mentioned (passwords and rate limiting)"
```

### Research builds on problems
```
Research: "Backend found rate limiting issues.
I searched for solutions: 
- Express-rate-limit npm package
- Best practices from OWASP"
```

### Report prioritizes based on all input
```
Report: "Considering Frontend UI issues,
Backend security problems, and
Research's available solutions,
here's the prioritized plan..."
```

## Files for Team Mode

- **src/team-session.js** - Main team orchestrator
- **src/agents/\*.js** - Individual agents (can be used standalone)
- **src/index.js** - Old orchestrator (for individual agent mode)

## Switching Between Modes

```bash
# Team mode (all agents in shared chat)
npm run team

# Individual agent mode (separate analyses)
npm start
```

## Performance

- **Team session**: 2-3 minutes (natural flow)
- **Individual agents**: 2-3 minutes total (parallel)
- **Cost**: Same (~$0.30-0.50 per analysis)

## Customization

### Modify Team Flow
Edit `src/team-session.js` to change:
- Agent speaking order
- Context passed between agents
- Team announcements

### Change Agent Prompts
Each agent has expertise list and custom prompts in team-session.js

### Add Team Commands
```javascript
// In TeamSession class
async agentRespondsToOther(fromMemberId, toMemberId, message) {
  // Specific agent-to-agent communication
}
```

## Tips for Best Results

1. **Let them talk naturally** - Don't interrupt flow
2. **Reference earlier findings** - Use context from previous agents
3. **Build on each other** - Next agent references previous
4. **Diverse perspectives** - Each agent sees whole picture
5. **Use team summary** - Review all perspectives at end

## Next Steps

1. **Run team session**: `npm run team`
2. **Review output** - See all agents collaborating
3. **Customize** - Modify team flow in team-session.js
4. **Iterate** - Agents improve on each other's findings

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agents seem disconnected | Check they're using shared teamChat |
| Missing context | Ensure agentSpeak includes previous messages |
| Response too long | Increase max_tokens in team-session.js |

---

**Your Claude Code TEAM is ready! 🤝**

Run `npm run team` to see real collaboration in action.

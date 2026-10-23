# Hackathon Rules and Guidance

The JSON block below is the canonical structured content of this document.
Extract the single `json` fenced code block and parse it with a standard JSON
parser. `schema_version` identifies the document structure version. Ordered
arrays preserve workflow and checklist order; task lists do not indicate
completion. Examples and ideas are separate from submission requirements.

This document reformats the original notes; it does not independently verify
current event rules. The deadline year is `null` because the original notes do
not specify it. Onboarding notes begin at minute 10; no earlier steps were
provided.

```json
{
  "schema_version": 1,
  "tracks": [
    {
      "id": 1,
      "name": "Solving Fragmented Intelligence",
      "description": "Demonstrate a clever ability to discover and work across fragmented data sources."
    },
    {
      "id": 2,
      "name": "The Agent That Can Explain Why",
      "description": "Build agents that investigate complex questions across multiple data sources, connect findings, and produce evidence-backed answers or recommendations."
    },
    {
      "id": 3,
      "name": "Reasoning Architecture",
      "description": "Demonstrate a novel ability to turn data, knowledge, memory, and reasoning into reliable decisions and actions."
    }
  ],
  "ideas": [
    {
      "name": "Cybersecurity tooling discovery",
      "description": "Find the latest GitHub repositories related to cybersecurity tooling every day. Generate a concise report about advancements and their relevance to the user's work. Maintain a tool inventory that supports semantic search to find relevant tools for a given need."
    }
  ],
  "submission": {
    "goals": [
      "Demonstrate a novel or creative approach to the problem.",
      "Demonstrate that the system does real work and holds up.",
      "Include feedback loops.",
      "Build agents that go beyond a simple wrapper around prompts.",
      "Provide evidence of decision-making.",
      "Show how the system reached its output."
    ],
    "agent_behavior_examples": [
      "Dynamic task delegation.",
      "Agents that critique or validate outputs.",
      "Iterative loops, such as planner, executor, and evaluator feedback.",
      "Shared memory or shared context.",
      "Branching, retries, escalation, and recovery.",
      "Logs or traces showing how the system reasoned and refined its work."
    ],
    "workflow_example": [
      {
        "step": 1,
        "role": "Planner",
        "action": "Creates an approach."
      },
      {
        "step": 2,
        "role": "Executor",
        "action": "Attempts the task."
      },
      {
        "step": 3,
        "role": "Evaluator",
        "action": "Detects missing evidence."
      },
      {
        "step": 4,
        "role": "Planner",
        "action": "Revises the plan."
      },
      {
        "step": 5,
        "role": "Research Agent",
        "action": "Retrieves new context."
      },
      {
        "step": 6,
        "role": "Executor",
        "action": "Reruns the task."
      },
      {
        "step": 7,
        "role": "Evaluator",
        "action": "Approves or requests another iteration."
      },
      {
        "step": 8,
        "role": "Final Agent",
        "action": "Produces the answer."
      }
    ],
    "challenge_page_contents": [
      "Challenge statement",
      "Problem and use case",
      "What you are expected to build",
      "Sponsor technology involved",
      "Submission requirements"
    ],
    "track_selection_guidance": "Pick a track where you can build a reliable, working solution within the build window. A focused solution that runs is stronger than an ambitious one that does not.",
    "required_materials": [
      {
        "component": "Demo video",
        "duration_minutes": {
          "min": 1,
          "max": 4
        },
        "requirements": [
          "Show the main workflow.",
          "Show how the agent solves the selected challenge.",
          "Show key features.",
          "Show how Zetaris and Meterless are integrated."
        ]
      },
      {
        "component": "Slide deck",
        "requirements": [
          "The problem and target users",
          "The solution",
          "The agent workflow or architecture",
          "The technical stack",
          "How Zetaris and Meterless were used",
          "What was unique about the use of sponsor technologies",
          "Product visuals",
          "Future enhancements"
        ]
      },
      {
        "component": "GitHub repository",
        "requirements": [
          "All source code",
          "A README covering setup, usage, and dependencies",
          "Google Colab links if the agents run in Google Colab"
        ]
      },
      {
        "component": "Sponsor technology explanation",
        "requirements": [
          "How Zetaris and Meterless were integrated",
          "How Cursor was used during development",
          "Where NVIDIA technology contributes",
          "What was unique about the use of sponsor technologies"
        ]
      }
    ],
    "evaluation": {
      "criteria": [
        {
          "name": "Impact",
          "points": 30,
          "description": "Consistency with the challenge statements: how effectively the solution addresses a meaningful real-world problem for its intended users."
        },
        {
          "name": "Technical",
          "points": 20,
          "description": "How well the solution is built, including its technical implementation, reliability, and architecture."
        },
        {
          "name": "Innovation",
          "points": 15,
          "description": "How original or creative the approach to solving the problem is."
        },
        {
          "name": "Demo",
          "points": 15,
          "description": "How clearly the demo shows the solution, its functionality, and the value it provides to its intended users."
        },
        {
          "name": "Product & UX",
          "points": 10,
          "description": "How intuitive, accessible, and easy to use the product is for its intended users."
        },
        {
          "name": "Sponsor Tech",
          "points": 10,
          "description": "How effectively the solution uses the sponsors' technology to address the problem and enhance the overall product."
        }
      ],
      "total_points": 100
    }
  },
  "onboarding": {
    "stages": [
      {
        "start_minute": 10,
        "end_minute": 15,
        "name": "Set up support",
        "tasks": [
          "Find the help desk channel and sponsor help channels on HackOS.",
          "Find the mentor office hours schedule."
        ]
      },
      {
        "start_minute": 15,
        "end_minute": 20,
        "name": "Sponsor technology",
        "tasks": [
          "Read the sponsor folders in Resources: Zetaris, Meterless, Space XAI and Cursor, and NVIDIA.",
          "Watch or bookmark the workshop recordings.",
          "Complete any required access or setup steps."
        ]
      },
      {
        "start_minute": 20,
        "end_minute": 25,
        "name": "Build environment",
        "tasks": [
          "Create or clone the project repository.",
          "Set up Cursor for development.",
          "Confirm the local environment works.",
          "Add .env to .gitignore.",
          "Add .env.example with placeholder values only."
        ]
      },
      {
        "start_minute": 25,
        "end_minute": 30,
        "name": "Plan the first prototype",
        "tasks": [
          "Define the agents and their roles.",
          "Write down how they will work together.",
          "Identify the feedback loop, retry path, or evaluator.",
          "Decide where Zetaris and Meterless fit, and where NVIDIA can contribute.",
          "Create the first test input."
        ]
      }
    ],
    "expected_outcomes_after_30_minutes": [
      "Know which track to target.",
      "Know whether to build solo or in a team.",
      "Know how the sponsor technology fits into the build.",
      "Know what agents to build first.",
      "Know where to ask for help."
    ]
  },
  "build_plan": {
    "guidance": "Get a working end-to-end system early.",
    "stages": [
      {
        "days": [1],
        "name": "Scope and skeleton",
        "tasks": [
          "Confirm the track, user, and expected output.",
          "Choose the smallest useful version of the solution.",
          "Connect Zetaris and Meterless.",
          "Implement a basic working agent loop."
        ]
      },
      {
        "days": [2, 3],
        "name": "Agent behavior",
        "tasks": [
          "Add evaluation, critique, or review steps.",
          "Add retries and branching.",
          "Add shared context or memory.",
          "Start logging agent activity."
        ]
      },
      {
        "days": [4],
        "name": "Data and tools",
        "tasks": [
          "Add datasets, tools, and retrieval.",
          "Test failures and fallbacks."
        ]
      },
      {
        "days": [5],
        "name": "Hardening",
        "tasks": [
          "Complete documentation and the README.",
          "Prepare the slide deck.",
          "Record the demo video (1–4 minutes).",
          "Test a clean setup from scratch."
        ]
      },
      {
        "days": [6],
        "name": "Final checks and submission",
        "tasks": [
          "Complete all submission materials.",
          "Declare any pre-existing components.",
          "Check for committed secrets.",
          "Submit before 27 October, 23:45 UTC."
        ]
      }
    ],
    "submission_deadline": {
      "month": 10,
      "day": 27,
      "time": "23:45",
      "timezone": "UTC",
      "year": null
    }
  },
  "immediate_next_steps": [
    "Confirm the track and how to build.",
    "Set up Zetaris, Meterless, and Cursor.",
    "Build the smallest working version first.",
    "Log agent activity from day one.",
    "Keep checking HackOS for updates."
  ],
  "final_reminder": {
    "guidance": "The strongest submissions demonstrate the following qualities; the flashiest interface is not the deciding factor.",
    "qualities": [
      "A real problem",
      "A working agent system",
      "Good use of sponsor technology",
      "Reliable execution",
      "Useful outputs"
    ]
  }
}
```

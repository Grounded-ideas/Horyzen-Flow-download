import { format } from "date-fns";

export interface Template {
  name: string;
  description: string;
  content: string;
}

export const BUILTIN_TEMPLATES: Template[] = [
  {
    name: "Blank Page",
    description: "Start with a clean slate.",
    content: "# {{title}}\n\n",
  },
  {
    name: "Daily Journal",
    description: "Reflect on your day, mood, and focus.",
    content: "# Daily Journal: {{date}}\n\n**Mood:** \n**Gratitude:** \n\n## What happened today?\n\n\n## Focus for tomorrow\n\n",
  },
  {
    name: "Meeting Notes",
    description: "Capture attendees, agenda, and decisions.",
    content: "# Meeting: {{title}}\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n\n## Decisions\n\n\n## Action Items\n- [ ] ",
  },
  {
    name: "Project Plan",
    description: "Outline goals, timeline, and milestones.",
    content: "# Project: {{title}}\n\n## Goals\n\n\n## Timeline\n\n\n## Resources\n\n\n## Milestones\n- [ ] ",
  },
  {
    name: "Blog Post",
    description: "Draft your next masterpiece.",
    content: "# {{title}}\n**Draft Date:** {{date}}\n**Tags:** \n\n---\n\n## Introduction\n\n\n## Main Content\n\n\n## Conclusion\n",
  },
  {
    name: "Book Notes",
    description: "Summarize and capture quotes from your reading.",
    content: "# Book: {{title}}\n**Author:** \n**Date Read:** {{date}}\n\n## Summary\n\n\n## Key Quotes\n> \n\n## Personal Takeaways\n",
  },
  {
    name: "Brain Dump",
    description: "Just start writing, no structure needed.",
    content: "# Brain Dump: {{date}} {{time}}\n\n",
  },
];

export function processTemplate(content: string, title: string): string {
  const now = new Date();
  return content
    .replace(/{{date}}/g, format(now, "yyyy-MM-dd"))
    .replace(/{{time}}/g, format(now, "HH:mm"))
    .replace(/{{title}}/g, title)
    .replace(/{{weekday}}/g, format(now, "EEEE"));
}

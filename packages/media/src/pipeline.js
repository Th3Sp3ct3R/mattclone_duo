export class MediaPipelineStep {
  constructor({ name, run }) {
    this.name = name;
    this.runner = run;
  }

  async run(context = {}) {
    if (typeof this.runner !== 'function') {
      throw new Error(`${this.name} step runner is required`);
    }
    return this.runner(context);
  }
}

export class MediaPipeline {
  constructor(steps = []) {
    this.steps = steps;
  }

  async run(initialContext = {}) {
    let context = { ...initialContext };
    for (const step of this.steps) {
      const output = await step.run(context);
      context = { ...context, ...output };
    }
    return context;
  }
}

export function createClipCandidate({ title = '', startSeconds, endSeconds, score = 0, rationale = '' } = {}) {
  return {
    title,
    startSeconds: Number(startSeconds),
    endSeconds: Number(endSeconds),
    score: Number(score || 0),
    rationale
  };
}

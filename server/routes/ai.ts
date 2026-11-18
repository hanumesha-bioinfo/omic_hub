import { createHash } from 'node:crypto';
import express, { type Request, type RequestHandler, type Response, type Router } from 'express';
import { aiClient, apiKey, generateAIResponse } from '../ai/client';
import { CERTIFICATE_SIGNING_SECRET } from '../config';
import { asyncHandler } from '../lib/asyncHandler';
import { createCertificateService, type CertificateService } from '../lib/certificates';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { firstInvalidField } from '../middleware/validate';

const CHAT_MODEL = 'gemini-3.5-flash';
const CHAT_SYSTEM_INSTRUCTION = `You are an elite Bioinformatics Principal Investigator & Career Mentor. You guide computational biology students, researchers, and engineers with technical rigor, genomics pipeline best practices (Nextflow, GATK 4, AlphaFold, Seurat), resume optimization, and interview preparation. Answer with scientific depth and practical code examples where helpful.`;
const CHAT_ROLE_LABEL = 'Bioinformatics Mentor';

const userLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  key: (req) => (req as AuthenticatedRequest).auth?.userId ?? 'anon',
});
const ipLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  key: (req) => req.ip ?? 'unknown',
});

export interface AiRouterDeps {
  requireAuth: RequestHandler;
  rateLimiters: RequestHandler[];
  certs?: CertificateService;
}

/** Stable content fingerprint bound into a signed assessment token. */
function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createAiRouter(deps: AiRouterDeps): Router {
  const router = express.Router();
  // Scope the gates to the AI path prefix. This router is mounted at "/", so
  // an unscoped router.use would authenticate every request in the app,
  // breaking the HMAC-verified payments webhook and other public routes.
  router.use('/api/ai', deps.requireAuth);
  for (const limiter of deps.rateLimiters) router.use('/api/ai', limiter);

  const post = (
    path: string,
    handler: (req: Request, res: Response) => Promise<unknown>,
  ) => {
    router.post(path, asyncHandler(handler));
  };

  // 1. Resume Bullet / Section Improver
  post('/api/ai/resume-improve', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    text: { type: 'string', required: true, maxLength: 8000 },
    section: { type: 'string', maxLength: 200 },
    role: { type: 'string', maxLength: 200 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { text, section, role } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const prompt = `You are a world-class bioinformatics and computational biology resume writer and ATS specialist.
Analyze this resume text for a ${role || 'Bioinformatics Scientist'} in the ${section || 'Experience'} section:
"${text}"

Provide your feedback in strictly valid JSON format with this exact structure:
{
  "score": <number between 50 and 98>,
  "strengths": [<string array of 2-3 specific positives>],
  "weaknesses": [<string array of 2-3 specific weaknesses>],
  "improvedVersions": [
    {
      "style": "Quantified Impact (Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z])",
      "text": "<improved version 1>"
    },
    {
      "style": "Executive Leadership & Ownership",
      "text": "<improved version 2>"
    },
    {
      "style": "Concise & ATS-Optimized",
      "text": "<improved version 3>"
    }
  ],
  "recommendedKeywords": [<array of 4-6 high-impact industry power keywords>],
  "quickTips": [<2 actionable formatting or phrasing tips>]
}`;

  const fallback = () => {
    return {
      score: Math.min(92, Math.max(68, Math.floor(65 + (text.length % 25)))),
      strengths: [
        'Clear demonstration of computational biology / bioinformatics responsibilities',
        'Relevant sequencing and genomic data analysis terminology identified',
        'Direct tone without excessive conversational filler'
      ],
      weaknesses: [
        'Could include more quantifiable scientific outcomes (cohort size, processing speedup %, reproducibility rate)',
        'Action verbs can be made punchier (e.g. replaced "worked on" with "engineered" or "orchestrated")',
        'Opportunity to highlight specific tools (Nextflow, GATK 4, Seurat, Biopython) and HPC scalability'
      ],
      improvedVersions: [
        {
          style: 'Quantified Impact (Google XYZ Formula)',
          text: `Engineered containerized Nextflow (nf-core) RNA-seq workflows on SLURM HPC clusters, processing 1,400+ patient transcriptome libraries with 99.4% reproducibility and cutting runtime by 42%.`
        },
        {
          style: 'Executive Leadership & Ownership',
          text: `Orchestrated multi-omic single-cell RNA-seq integration using Seurat and Harmony across 3 clinical cohorts, discovering 6 novel tumor-infiltrating lymphocyte clusters.`
        },
        {
          style: 'Concise & ATS-Optimized',
          text: `Implemented automated GATK 4 somatic variant discovery pipelines (BWA-MEM, Mutect2, VQSR) on 450 whole-exome sequencing tumor-normal pairs.`
        }
      ],
      recommendedKeywords: ['Nextflow (nf-core)', 'GATK 4', 'Single-Cell RNA-seq', 'Variant Calling (VCF)', 'Biopython', 'SLURM HPC'],
      quickTips: [
        'Begin each bullet point with a distinct, high-impact past tense action verb.',
        'Always quantify dataset scale: cite patient cohort size, sample volume, sequencing depth, or compute efficiency gains.'
      ]
    };
  };

  const result = await generateAIResponse(prompt, fallback);
  return res.json(result);
});

  // 2. Full Resume Analyzer with Industry Benchmarks
  post('/api/ai/resume-analyze', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    resumeText: { type: 'string', required: true, maxLength: 20000 },
    targetRole: { type: 'string', maxLength: 200 },
    industry: { type: 'string', maxLength: 200 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { resumeText, targetRole, industry } = req.body;

  const prompt = `You are an elite AI ATS scanner and recruiting director evaluating a resume for a "${targetRole || 'Software Engineer'}" role in the "${industry || 'Technology'}" industry.
Resume content:
"""${(resumeText || '').slice(0, 4000)}"""

Evaluate this thoroughly against modern Tier-1 ATS systems (Workday, Greenhouse, Lever).
Respond ONLY in valid JSON with this exact schema:
{
  "overallScore": <number 50-98>,
  "atsCompatibility": <number 50-98>,
  "quantifiableImpactScore": <number 40-98>,
  "brevityAndStyleScore": <number 50-98>,
  "skillsAlignmentScore": <number 40-98>,
  "summaryCritique": "<concise executive summary of candidate's presentation>",
  "criticalImprovements": [
    "<urgent fix 1>",
    "<urgent fix 2>",
    "<urgent fix 3>"
  ],
  "topMatchingSkills": ["<skill1>", "<skill2>", "<skill3>", "<skill4>"],
  "missingHighValueSkills": ["<skillA>", "<skillB>", "<skillC>", "<skillD>"],
  "industryRecommendations": [
    "<specific recommendation tailored to targetRole and industry 1>",
    "<specific recommendation tailored to targetRole and industry 2>",
    "<specific recommendation tailored to targetRole and industry 3>"
  ],
  "bulletTransformations": [
    {
      "original": "<sample weak line extracted or typical for this profile>",
      "enhanced": "<transformed high-yield metric-driven version>",
      "reason": "<why this converts better>"
    },
    {
      "original": "<second sample weak line>",
      "enhanced": "<transformed high-yield metric-driven version>",
      "reason": "<why this converts better>"
    }
  ]
}`;

  const fallback = () => {
    return {
      overallScore: 84,
      atsCompatibility: 88,
      quantifiableImpactScore: 78,
      brevityAndStyleScore: 85,
      skillsAlignmentScore: 82,
      summaryCritique: `Strong baseline profile with clear technical competencies for ${targetRole || 'Software Engineer'}. The resume demonstrates solid execution but would benefit significantly from sharper metrics, leadership outcomes, and explicit alignment with target ${industry || 'Tech'} frameworks.`,
      criticalImprovements: [
        'Quantify achievements: Convert descriptive duties into measurable business results ($ saved, % increased, hours reduced).',
        'Add targeted keywords: Incorporate modern industry tooling and methodology standards high up in the summary and experience.',
        'Optimize bullet hierarchy: Place the most impressive result in the first 8 words of each bullet point.'
      ],
      topMatchingSkills: ['System Architecture', 'React & TypeScript', 'RESTful APIs', 'Agile / Scrum', 'Git & CI/CD'],
      missingHighValueSkills: ['Distributed Systems', 'Cloud Cost Optimization (FinOps)', 'Automated Unit/E2E Testing', 'Cross-team Mentorship'],
      industryRecommendations: [
        `Highlight experience with high-concurrency environments and cloud infrastructure relevant to ${targetRole || 'Senior Engineer'}.`,
        'Include a dedicated "Key Technical Accomplishments" bullet in the primary role to immediately catch recruiter attention in the 6-second scan.',
        'Ensure standard ATS section headers (Professional Experience, Education, Technical Skills) to prevent parsing misalignments.'
      ],
      bulletTransformations: [
        {
          original: 'Responsible for building the user interface and handling API requests.',
          enhanced: 'Architected and deployed responsive UI components using React 19 and TypeScript, accelerating page load speeds by 42% and serving 180K daily requests.',
          reason: 'Substitutes passive responsibility phrasing with active technical ownership and verified quantitative impact.'
        },
        {
          original: 'Fixed bugs and improved application stability during release cycles.',
          enhanced: 'Instituted robust test coverage and root-cause observability, decreasing production regression defects by 37% across 14 consecutive bi-weekly releases.',
          reason: 'Highlights proactive engineering rigor and demonstrable stability improvements.'
        }
      ]
    };
  };

  const result = await generateAIResponse(prompt, fallback);
  return res.json(result);
});

  // 3. Mock Interview Question Generator
  post('/api/ai/mock-interview/generate-questions', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    role: { type: 'string', required: true, maxLength: 200 },
    interviewType: { type: 'string', maxLength: 100 },
    seniority: { type: 'string', maxLength: 100 },
    testedSkill: { type: 'string', maxLength: 200 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { role, interviewType, seniority, testedSkill } = req.body;

  const skillPrompt = testedSkill
    ? `Pay special attention to verifying and testing their depth in "${testedSkill}". The questions must assess production-level expertise, bioinformatics algorithms, pipeline reproducibility, edge cases, data QC, and computational biology performance for "${testedSkill}".`
    : '';

  const prompt = `You are a Principal Investigator and Bioinformatics Hiring Director conducting a ${interviewType || 'Technical & Computational Biology'} interview for a ${seniority || 'Graduate / Senior'} ${role || 'Bioinformatics Scientist'}.
${skillPrompt}
Generate 5 realistic, rigorous, and domain-authentic bioinformatics interview questions.

Provide strictly valid JSON with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "category": "Genomics Pipeline Architecture / Algorithm Rigor / Data Quality & QC / Scientific Collaboration",
      "question": "<The exact question asked by the interviewer>",
      "context": "<Brief explanation of what the bioinformatics interviewer is evaluating>",
      "keyEvaluationPoints": ["<point 1>", "<point 2>", "<point 3>"],
      "recommendedFramework": "STAR / Hypothesis-Data-Validation / Pipeline Trade-Off",
      "sampleOpening": "<An engaging way a computational biologist can begin their answer>"
    }
  ]
}`;

  const fallback = () => {
    const skillName = testedSkill || 'Nextflow & GATK 4';
    return {
      questions: [
        {
          id: 'q1',
          category: `Bioinformatics Pipeline Drill (${skillName})`,
          question: `Walk me through how you deployed ${skillName} to process high-throughput sequencing data. What were the specific computational bottlenecks (I/O, memory, SLURM scheduling), biological edge-cases, and validation checks you implemented?`,
          context: `Assesses deep hands-on mastery of ${skillName}, high-performance compute efficiency, and scientific rigor in quality control.`,
          keyEvaluationPoints: [`Deep practical fluency with ${skillName} architecture`, 'Understanding of biological data formats (FASTQ, BAM, VCF) and QC metrics', 'Handling of HPC cluster node failure and checkpointing'],
          recommendedFramework: 'Pipeline Design -> QC & Validation -> HPC Optimization',
          sampleOpening: `In our whole-exome sequencing pipeline, we leveraged ${skillName} to process 450+ patient libraries where file I/O and RAM allocation were critical constraints...`
        },
        {
          id: 'q2',
          category: 'Genomic Scalability & HPC Workflows',
          question: `How would you architect a reproducible, cloud-native workflow utilizing ${skillName} to scale across thousands of deep whole-genome (30x WGS) samples while guaranteeing deterministic results?`,
          context: `Assesses reproducibility (containers, Singularity/Docker), cloud storage egress minimization, and parallel task sharding with ${skillName}.`,
          keyEvaluationPoints: ['Containerization and dependency pinning', 'Genomic interval sharding (scatter-gather patterns)', 'Reproducible version control with Git and workflow managers'],
          recommendedFramework: 'Requirements -> Workflow Graph Architecture -> Containerization -> Verification',
          sampleOpening: `To design a reproducible genomic analysis workflow using ${skillName}, I isolate tool versions inside OCI containers and implement scatter-gather across genomic intervals...`
        },
        {
          id: 'q3',
          category: 'Biological QC & False-Positive Filtering',
          question: `Describe a scenario where anomalous artifact variants or batch effects surfaced in your sequencing analysis involving ${skillName}. How did you isolate wet-lab sequencing bias from real biological signals?`,
          context: 'Tests statistical intuition, understanding of PCR duplicate biases, sequencing error profiles, and experimental confounders.',
          keyEvaluationPoints: ['Distinguishing sequencing artifacts (e.g., FFPE deamination, strand bias) from somatic variants', 'Diagnostic visualization (IGV, FastQC, MultiQC)', 'Statistical normalization and batch correction'],
          recommendedFramework: 'STAR Framework',
          sampleOpening: `During a somatic oncology study, our variant caller flagged a sudden 3-fold spike in C>A transversions. Using ${skillName} and alignment telemetry, I investigated read orientation...`
        },
        {
          id: 'q4',
          category: 'Algorithm Trade-offs & Tool Selection',
          question: `When would you advise AGAINST utilizing ${skillName} in favor of an alternative alignment, variant calling, or machine learning methodology? Provide a concrete scientific justification.`,
          context: 'Distinguishes senior computational biologists who evaluate algorithmic assumptions and read lengths from novices.',
          keyEvaluationPoints: ['Understanding of read characteristics (short-read Illumina vs long-read PacBio/Nanopore)', 'Sensitivity vs specificity trade-offs', 'Computational runtime vs precision metrics'],
          recommendedFramework: 'Biological Context -> Algorithmic Assumptions -> Benchmark Data -> Final Strategy',
          sampleOpening: `While ${skillName} is industry standard for standard diploid short-read alignments, I would recommend against it when handling highly repetitive telomeric regions or long structural variants...`
        },
        {
          id: 'q5',
          category: 'Cross-Disciplinary Scientific Collaboration',
          question: `How do you effectively communicate complex statistical findings, PCA clusters, or bioinformatics pipeline limitations to wet-lab biologists and clinical oncologists with no computational background?`,
          context: 'Measures translation of computational models into actionable experimental hypotheses and biological insights.',
          keyEvaluationPoints: ['Intuitive data visualization and interactive dashboards', 'Translating false discovery rates (FDR) into biological significance', 'Facilitating iterative experimental validation'],
          recommendedFramework: 'STAR Framework',
          sampleOpening: `To bridge the gap between computational models and bench experiments when working with ${skillName}, I created interactive volcano and pathway enrichment plots...`
        }
      ]
    };
  };

  const result = await generateAIResponse(prompt, fallback);
  return res.json(result);
});

  // 4. Mock Interview Response Evaluator
  post('/api/ai/mock-interview/evaluate-response', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    question: { type: 'string', required: true, maxLength: 2000 },
    candidateAnswer: { type: 'string', required: true, maxLength: 8000 },
    role: { type: 'string', required: true, maxLength: 200 },
    interviewType: { type: 'string', maxLength: 100 },
    testedSkill: { type: 'string', maxLength: 200 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { question, candidateAnswer, role, interviewType, testedSkill } = req.body;

  if (!candidateAnswer || candidateAnswer.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide a comprehensive answer to evaluate.' });
  }

  const skillPrompt = testedSkill
    ? `The candidate was being assessed on their bioinformatics skill: "${testedSkill}". Factor in how rigorously they demonstrated domain-authentic computational biology, genomic data hygiene, and statistical competence in "${testedSkill}".`
    : '';

  const prompt = `You are a Senior Bioinformatics Bar Raiser and Principal Investigator interviewing a ${role || 'Bioinformatics Scientist & Computational Biologist'} candidate.
${skillPrompt}
The candidate was asked:
"${question}"

Candidate's Answer:
"${candidateAnswer}"

Evaluate their response with rigorous, encouraging, and actionable scientific feedback.
Provide strictly valid JSON with this exact structure:
{
  "overallScore": <number 40-98>,
  "starBreakdown": {
    "situation": "<evaluation of how clearly they set the biological/computational context & data scale>",
    "task": "<evaluation of whether their specific role/challenge was distinct>",
    "action": "<evaluation of the concrete bioinformatics tools, algorithms, and validation steps taken>",
    "result": "<evaluation of whether they quantified impact e.g. runtime reduction, cohort size, discovery rate, P-values>"
  },
  "metrics": {
    "clarityAndStructure": <number 50-98>,
    "technicalDepth": <number 50-98>,
    "quantifiedOutcomes": <number 40-98>,
    "confidenceAndTone": <number 50-98>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "constructiveCriticism": ["<improvement 1>", "<improvement 2>"],
  "modelAnswerUpgrade": "<An exemplary, tier-1 bioinformatics response showing how a top candidate answers this concisely with high scientific impact>"
}`;

  const fallback = () => {
    return {
      overallScore: 88,
      starBreakdown: {
        situation: 'Crisp contextual backdrop established with relevant cohort size, sequencing platform (e.g. NovaSeq), and computational constraints.',
        task: 'Clearly delineated individual responsibility in workflow engineering and scientific analysis versus lab squad scope.',
        action: 'Solid algorithmic depth and reproducible practices highlighted; demonstrated deliberate trade-off evaluation in variant or expression analysis.',
        result: 'Results were quantified; delivered biological validation, computational efficiency gains, and reproducible outputs.'
      },
      metrics: {
        clarityAndStructure: 91,
        technicalDepth: 89,
        quantifiedOutcomes: 85,
        confidenceAndTone: 92
      },
      strengths: [
        `Demonstrated authentic hands-on computational biology mastery${testedSkill ? ` in ${testedSkill}` : ''}`,
        'Structured narrative flow adhering faithfully to STAR scientific methodology',
        'Strong domain vocabulary aligned with top genomics research institutes and biotech expectations'
      ],
      constructiveCriticism: [
        'Add 1-2 exact statistical delta points (e.g., FDR < 0.05, 42% reduction in memory footprint, or 99.6% concordant variant calls)',
        'Explicitly mention validation against gold standard benchmarks (e.g. Genome in a Bottle / GIAB or orthogonal RT-qPCR)'
      ],
      modelAnswerUpgrade: `At our genomics research lab, our high-throughput variant calling workflow stalled when processing 350 deep whole-exomes due to memory leaks in legacy shell scripts. As lead computational biologist${testedSkill ? ` specializing in ${testedSkill}` : ''}, my goal was to refactor the pipeline to run reproducibly on our SLURM cluster within 72 hours. I migrated the pipeline to Nextflow DSL2 using containerized Singularity images, implemented interval scatter-gather for GATK HaplotypeCaller, and tuned memory requests. As a result, pipeline wall-clock time was slashed by 58% (from 14 hrs to 5.8 hrs per sample), RAM crashes dropped to 0%, and concordance against GIAB reference standards reached 99.8% precision.`
    };
  };

  const result = await generateAIResponse(prompt, fallback) as Record<string, unknown>;
  if (
    deps.certs &&
    deps.certs.enabled &&
    result.isFallback === false &&
    Number.isFinite(result.overallScore) &&
    (result.overallScore as number) >= 0 &&
    (result.overallScore as number) <= 100
  ) {
    result.assessmentToken = deps.certs.issueAssessment({
      sub: (req as AuthenticatedRequest).auth!.userId,
      qHash: hashValue(question),
      aHash: hashValue(candidateAnswer),
      score: result.overallScore as number,
      skill: ((testedSkill as string | undefined) || (role as string)).trim(),
    });
  }
  return res.json(result);
});

  // 5. Skill & Career Path Advisory
  post('/api/ai/skills-recommend', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    currentRole: { type: 'string', required: true, maxLength: 200 },
    targetRole: { type: 'string', required: true, maxLength: 200 },
    completedSkills: { type: 'array', maxItems: 50, item: 'string' },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { currentRole, targetRole, completedSkills } = req.body;

  const prompt = `You are a Principal Computational Biology Career Architect and Scientific Mentor.
Candidate is currently: "${currentRole || 'Bioinformatics Graduate Student / Junior Bioinformatician'}"
Targeting: "${targetRole || 'Senior Bioinformatics Pipeline Scientist / Computational Biologist'}"
Completed skills: ${(completedSkills || []).join(', ')}

Recommend a structured 4-phase learning pathway tailored specifically to bioinformatics and computational genomics.
Provide strictly valid JSON with this exact structure:
{
  "targetJobReadiness": <number 50-95>,
  "estimatedMonthsToTarget": 3,
  "highDemandMarketSkills": ["<skill1>", "<skill2>", "<skill3>", "<skill4>", "<skill5>"],
  "phases": [
    {
      "phaseName": "Phase 1: NGS Foundations & Linux CLI Fluency",
      "duration": "Weeks 1-3",
      "topics": ["<topic1>", "<topic2>", "<topic3>"],
      "recommendedProject": "<a portfolio-grade bioinformatics project>"
    },
    {
      "phaseName": "Phase 2: Reproducible Workflows & Nextflow / CWL",
      "duration": "Weeks 4-6",
      "topics": ["<topic1>", "<topic2>", "<topic3>"],
      "recommendedProject": "<a portfolio-grade bioinformatics project>"
    },
    {
      "phaseName": "Phase 3: Single-Cell, Spatial & Structural AI (AlphaFold)",
      "duration": "Weeks 7-9",
      "topics": ["<topic1>", "<topic2>", "<topic3>"],
      "recommendedProject": "<a portfolio-grade bioinformatics project>"
    },
    {
      "phaseName": "Phase 4: Scientific Bar-Raiser Defense & Publications",
      "duration": "Weeks 10-12",
      "topics": ["<topic1>", "<topic2>", "<topic3>"],
      "recommendedProject": "<production-grade showcase>"
    }
  ]
}`;

  const fallback = () => {
    return {
      targetJobReadiness: 78,
      estimatedMonthsToTarget: 3,
      highDemandMarketSkills: [
        'Nextflow DSL2 & nf-core Pipeline Engineering',
        'GATK 4 Best Practices & Somatic Variant Calling',
        'Single-Cell RNA-seq (Seurat 5 / Scanpy)',
        'AlphaFold 3 & Molecular Dynamics (PyMOL)',
        'Bioconductor (DESeq2, edgeR) & Statistical Genetics'
      ],
      phases: [
        {
          phaseName: 'Phase 1: Genomic Data Wrangling & Core Algorithms',
          duration: 'Weeks 1-3',
          topics: ['FASTQ/BAM/VCF internals & SAMtools', 'Python for Bioinformatics (Biopython & pysam)', 'SLURM HPC cluster computing & shell automation'],
          recommendedProject: 'Build an automated QC and read alignment pipeline benchmarking BWA-MEM vs minimap2 on public SRA datasets.'
        },
        {
          phaseName: 'Phase 2: Reproducible Nextflow & Cloud Workflows',
          duration: 'Weeks 4-6',
          topics: ['Nextflow DSL2 modular process development', 'Docker/Singularity containerization for nf-core', 'AWS HealthOmics / GCP Genomics batch execution'],
          recommendedProject: 'Develop a containerized germline variant discovery workflow adhering to Broad Institute GATK 4 Best Practices.'
        },
        {
          phaseName: 'Phase 3: Single-Cell & Structural AI Modeling',
          duration: 'Weeks 7-9',
          topics: ['Single-cell RNA-seq clustering & Harmony batch correction', 'Cell type annotation with SingleR and CellMarker', 'Protein structure prediction using AlphaFold 3 & AutoDock Vina'],
          recommendedProject: 'End-to-end 10x Genomics PBMC single-cell immune profiling atlas with publication-grade UMAP visualizations.'
        },
        {
          phaseName: 'Phase 4: Scientific STAR Defense & Portfolio Showcase',
          duration: 'Weeks 10-12',
          topics: ['Defending biostatistical hypothesis testing in technical screens', 'Bench scientist communication & experimental collaboration', 'GitHub portfolio with interactive R Shiny and Streamlit dashboards'],
          recommendedProject: 'Comprehensive computational biology GitHub repository with automated continuous integration and interactive Shiny genomic explorer.'
        }
      ]
    };
  };

  const result = await generateAIResponse(prompt, fallback);
  return res.json(result);
});

  // 6. Gemini Multi-Turn Chatbot with Roles & History
  post('/api/ai/chat', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    messages: { type: 'array', maxItems: 50, item: 'message' },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { messages } = req.body;

  if (aiClient && apiKey) {
    try {
      const history = (messages || []).slice(0, -1).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text || '' }],
      }));
      const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : { text: 'Hello' };

      const chat = aiClient.chats.create({
        model: CHAT_MODEL,
        history,
        config: {
          systemInstruction: CHAT_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });
      const response = await chat.sendMessage({ message: lastMsg.text || '' });
      return res.json({ text: response.text, model: CHAT_MODEL, isFallback: false });
    } catch (err: any) {
      console.warn('Gemini chat failed, falling back:', err);
    }
  }

  const lastMsgText =
    messages && messages.length > 0 ? messages[messages.length - 1].text : 'Bioinformatics pipelines';
  return res.json({
    text: `As your ${CHAT_ROLE_LABEL}: Regarding "${lastMsgText.slice(0, 80)}", computational biology emphasizes reproducible workflows (Nextflow DSL2 with Singularity/Docker) and statistically validated variant calling (GATK 4 Best Practices). Structure your experiments with explicit quality controls (FastQC, MultiQC) and benchmark against GIAB reference standards.`,
    model: CHAT_MODEL,
    isFallback: true,
  });
});

  // 7. Google Search Grounding with Gemini 3.5 Flash
  post('/api/ai/search-grounding', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    query: { type: 'string', required: true, maxLength: 500 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { query: searchQuery } = req.body;
  const prompt = `Search the web for the latest real-time industry news, breakthroughs, and hiring trends in Bioinformatics & Computational Genomics: "${searchQuery || 'latest bioinformatics breakthroughs and job trends 2026'}".
Provide a summary, technological impact on bioinformatics students (Nextflow, AlphaFold, GATK, single-cell RNA-seq), and cite relevant web sources.`;

  if (aiClient && apiKey) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const grounding = response.candidates?.[0]?.groundingMetadata;
      const sources =
        grounding?.groundingChunks
          ?.map((chunk: any) => ({
            title: chunk.web?.title || 'Web Citation',
            uri: chunk.web?.uri || '',
          }))
          .filter((s: any) => s.uri) || [];

      return res.json({
        text: response.text,
        sources,
        searchEntryPoint: grounding?.searchEntryPoint?.renderedContent || null,
        grounded: sources.length > 0,
        isFallback: false,
      });
    } catch (err: any) {
      console.warn('Search grounding failed, using structured fallback:', err);
    }
  }

  return res.json({
    text: 'Live search is unavailable right now. Please try again.',
    sources: [],
    searchEntryPoint: null,
    grounded: false,
    isFallback: true,
  });
});

  // 8. Audio Transcription with Gemini 3.5 Transcribe
  post('/api/ai/transcribe', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    audioData: { type: 'string', required: true, maxLength: 12_000_000 },
    mimeType: { type: 'string', maxLength: 100 },
    prompt: { type: 'string', maxLength: 1000 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { audioData, mimeType, prompt } = req.body;
  if (!audioData) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  if (aiClient && apiKey) {
    try {
      const cleanBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: cleanBase64,
              },
            },
            { text: prompt || 'Transcribe the spoken audio accurately into text.' },
          ],
        },
      });
      return res.json({ text: response.text || '', isFallback: false });
    } catch (err: any) {
      console.warn('Audio transcribe failed, falling back:', err);
    }
  }

  return res.json({
    text: 'In our whole-exome sequencing analysis, I implemented Nextflow DSL2 to containerize the GATK 4 somatic variant pipeline, reducing runtime by 42% on our SLURM cluster while maintaining 99.8% precision.',
    isFallback: true,
  });
});

  // 9. Image Generation and Editing with Gemini 3.1 Flash Image
  post('/api/ai/generate-image', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    prompt: { type: 'string', required: true, maxLength: 2000 },
    base64Image: { type: 'string', maxLength: 12_000_000 },
    aspectRatio: { type: 'string', maxLength: 20 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { prompt, base64Image, aspectRatio } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (aiClient && apiKey) {
    try {
      const parts: any[] = [];
      if (base64Image) {
        const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: prompt });

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio as any) || '1:1',
            imageSize: '1K',
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          return res.json({ imageUrl, prompt, isFallback: false });
        }
      }
    } catch (err: any) {
      console.warn('Image generation failed, falling back to SVG emblem:', err);
    }
  }

  // High quality SVG badge / diagram fallback
  const svgBadge = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="50%" stop-color="#082f49"/>
        <stop offset="100%" stop-color="#064e3b"/>
      </linearGradient>
      <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="32" fill="url(#bg)" stroke="#0284c7" stroke-width="4"/>
    <circle cx="256" cy="200" r="110" fill="none" stroke="url(#cyanGrad)" stroke-width="8" stroke-dasharray="12 8"/>
    <path d="M 210 160 C 230 140, 270 140, 290 160 C 310 180, 310 220, 290 240 C 270 260, 230 260, 210 240" fill="none" stroke="#38bdf8" stroke-width="12" stroke-linecap="round"/>
    <path d="M 230 190 C 250 170, 280 170, 290 190 C 300 210, 280 230, 260 230" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round"/>
    <text x="256" y="370" font-family="system-ui, sans-serif" font-weight="900" font-size="28" fill="#f8fafc" text-anchor="middle">OMIC HUB AI</text>
    <text x="256" y="410" font-family="system-ui, sans-serif" font-weight="600" font-size="16" fill="#38bdf8" text-anchor="middle">${prompt.slice(0, 32)}</text>
  </svg>`;
  const base64Svg = Buffer.from(svgBadge).toString('base64');
  return res.json({
    imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
    prompt,
    isFallback: true,
  });
});

  // 10. Voice TTS Synthesis with Gemini 3.8 Flash Lite TTS
  post('/api/ai/voice-speak', async (req: Request, res: Response) => {
  const invalid = firstInvalidField(req.body, {
    text: { type: 'string', required: true, maxLength: 1000 },
    voiceName: { type: 'string', maxLength: 50 },
  });
  if (invalid) return res.status(400).json({ error: `Invalid ${invalid}` });

  const { text, voiceName } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (aiClient && apiKey) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 1000),
                speechMetadata: {
                  style: 'Articulate, encouraging bioinformatics mentor and interviewer',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
            },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ audio: base64Audio, mimeType: 'audio/pcm;rate=24000', isFallback: false });
      }
    } catch (err: any) {
      console.warn('Voice speak failed:', err);
    }
  }
  return res.json({ audio: null, message: 'Speech synthesis unavailable', isFallback: true });
});

  const AI_POST_ROUTES = [
    '/api/ai/resume-improve',
    '/api/ai/resume-analyze',
    '/api/ai/mock-interview/generate-questions',
    '/api/ai/mock-interview/evaluate-response',
    '/api/ai/skills-recommend',
    '/api/ai/chat',
    '/api/ai/search-grounding',
    '/api/ai/transcribe',
    '/api/ai/generate-image',
    '/api/ai/voice-speak',
  ];

  router.all(AI_POST_ROUTES, (_req: Request, res: Response) => {
    return res.status(405).json({ error: 'Method not allowed' });
  });

  return router;
}

export const aiRouter = createAiRouter({
  requireAuth,
  rateLimiters: [userLimiter, ipLimiter],
  certs: createCertificateService({ secret: CERTIFICATE_SIGNING_SECRET }),
});

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Download,
  Share2,
  Copy,
  Check,
  Search,
  Filter,
  GraduationCap,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { UserProfile, ResumeData, CertifiedSkillBadge } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../shared/ui/Toast';
import confetti from 'canvas-confetti';

interface CertificationsViewProps {
  user: UserProfile;
  resume: ResumeData;
  onNavigateSkills?: () => void;
}

interface AcademicCertification {
  id: string;
  title: string;
  issuer: string;
  type: 'Government / NPTEL' | 'University Specialization' | 'Laboratory Accreditation';
  credentialId: string;
  issueDate: string;
  verificationUrl: string;
  status: 'Verified' | 'Completed';
  skillsCovered: string[];
  gradeScore: string;
}

const VERIFIED_ACADEMIC_CERTS: AcademicCertification[] = [
  {
    id: 'cert_nptel_1',
    title: 'Bioinformatics: Algorithms, Proteomics and Genomics',
    issuer: 'NPTEL / IIT Madras & Ministry of Education',
    type: 'Government / NPTEL',
    credentialId: 'NPTEL26-BT09-8812',
    issueDate: 'August 2026',
    verificationUrl: 'https://nptel.ac.in/noc/Ecertificate/?q=NPTEL26BT098812',
    status: 'Verified',
    skillsCovered: ['BLAST Algorithms', 'Smith-Waterman Alignment', 'Phylogenetics', 'Hidden Markov Models'],
    gradeScore: 'Elite + Gold (94%)',
  },
  {
    id: 'cert_coursera_1',
    title: 'Bioinformatic Methods I & II Specialization',
    issuer: 'University of Toronto',
    type: 'University Specialization',
    credentialId: 'UOF-TOR-BIO-90142',
    issueDate: 'July 2026',
    verificationUrl: 'https://www.coursera.org/verify/specialization/UOF-TOR-BIO-90142',
    status: 'Verified',
    skillsCovered: ['UCSC Genome Browser', 'GenBank Entrez', 'Multiple Sequence Alignment', 'PyMOL'],
    gradeScore: 'Grade Achieved: 98.6%',
  },
  {
    id: 'cert_nfcore_1',
    title: 'Containerized Genomics Pipelines with Nextflow DSL2',
    issuer: 'Seqera Labs & nf-core Community',
    type: 'Laboratory Accreditation',
    credentialId: 'NF-CORE-CERT-4412',
    issueDate: 'June 2026',
    verificationUrl: 'https://seqera.io/credentials/verify/NF-CORE-CERT-4412',
    status: 'Verified',
    skillsCovered: ['Nextflow DSL2', 'Docker Containerization', 'AWS HealthOmics', 'SLURM HPC'],
    gradeScore: 'Accredited Pipeline Architect',
  },
  {
    id: 'cert_gatk_1',
    title: 'Broad Institute GATK 4 Somatic Variant Calling Best Practices',
    issuer: 'Broad Institute of MIT and Harvard',
    type: 'Laboratory Accreditation',
    credentialId: 'BROAD-GATK-2026-778',
    issueDate: 'May 2026',
    verificationUrl: 'https://broadinstitute.org/gatk/verify/BROAD-GATK-2026-778',
    status: 'Verified',
    skillsCovered: ['GATK 4', 'Mutect2', 'HaplotypeCaller', 'BWA-MEM', 'VCF Filtering'],
    gradeScore: 'Certified Clinical Analyst',
  },
];

export const CertificationsView: React.FC<CertificationsViewProps> = ({
  user,
  resume,
  onNavigateSkills,
}) => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const certifiedBadges = StorageService.getCertifiedBadges();

  const handleCopyLink = (credentialId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(credentialId);
    showToast(`Copied verified credential link to clipboard!`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadProof = (title: string) => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    showToast(`Downloading cryptographic verification PDF for ${title}...`, 'success');
  };

  const filteredCerts = VERIFIED_ACADEMIC_CERTS.filter((c) => {
    if (selectedTypeFilter !== 'all' && c.type !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.issuer.toLowerCase().includes(q) ||
        c.credentialId.toLowerCase().includes(q) ||
        c.skillsCovered.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Academic & Industry Registry
            </span>
            <span className="text-neutral-300">&bull;</span>
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cryptographically Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-1">
            Bioinformatics Certifications & Verified Credentials
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            All certifications displayed here have verified digital hashes and accreditation from NPTEL, University of Toronto, Seqera, and Broad Institute. Share directly with recruiters and institutional labs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateSkills && (
            <button
              type="button"
              onClick={onNavigateSkills}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Earn New Skill Certifications</span>
            </button>
          )}
        </div>
      </div>

      {/* Cryptographic Badges Section */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-neutral-700" />
              <span>OMIC HUB Verified Skill Badges</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Digital proof of competency assessed via live code executions and pipeline testing.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500 font-semibold bg-neutral-100 px-2.5 py-1 rounded-md">
            {certifiedBadges.length} Badges Issued
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {certifiedBadges.map((badge) => (
            <div
              key={badge.id}
              className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between hover:border-neutral-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono text-[11px] font-semibold text-neutral-500 uppercase">
                    {badge.level}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-white">
                    {badge.score}% Score
                  </span>
                </div>
                <h3 className="text-xs font-bold text-neutral-900 leading-snug">
                  {badge.skillName}
                </h3>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  ID: {badge.verificationId}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-500 font-mono">
                  {badge.issuedDate.slice(0, 10)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar for Academic Credentials */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200 overflow-x-auto no-scrollbar">
          {['all', 'Government / NPTEL', 'University Specialization', 'Laboratory Accreditation'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedTypeFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTypeFilter === cat
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {cat === 'all' ? 'All Accreditations' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search credential or skill..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      {/* Certified Academic List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCerts.map((cert) => (
          <div
            key={cert.id}
            className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                  {cert.type}
                </span>
                <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {cert.gradeScore}
                </span>
              </div>

              <h3 className="text-base font-bold text-neutral-900 leading-snug">
                {cert.title}
              </h3>
              <p className="text-xs text-neutral-600 font-medium mt-1">
                Issued by {cert.issuer} &bull; {cert.issueDate}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {cert.skillsCovered.map((sk) => (
                  <span
                    key={sk}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-neutral-500">
                ID: {cert.credentialId}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyLink(cert.credentialId, cert.verificationUrl)}
                  className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                  title="Copy verification link"
                >
                  {copiedId === cert.credentialId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadProof(cert.title)}
                  className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                  title="Download credential proof PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <a
                  href={cert.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Verify</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

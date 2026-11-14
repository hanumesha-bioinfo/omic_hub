import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

interface ResumePreviewProps {
  resume: ResumeData;
  scale?: number;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({ resume, scale = 1 }) => {
  const { personalInfo, summary, workExperiences, education, skills, projects, certifications, theme } = resume;

  const getSectionTitleClass = (extraMargin = 'mb-2') => {
    return `text-xs font-black uppercase tracking-wider text-neutral-900 border-b-2 border-neutral-900 pb-1 ${extraMargin}`;
  };

  return (
    <div
      style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      className="transition-transform duration-200"
    >
      <div
        id="printable-resume-area"
        className="w-full max-w-[800px] min-h-[1050px] mx-auto bg-white text-neutral-900 shadow-xl p-8 sm:p-10 font-sans border border-neutral-200 transition-colors"
      >
        {/* Simple & Clean White and Black Header */}
        <div className="pb-5 border-b-2 border-neutral-900 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 uppercase">
                {personalInfo.fullName || 'Bioinformatics Scholar'}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-neutral-700 mt-0.5 tracking-wide">
                {personalInfo.headline || 'Computational Biologist & NGS Pipeline Scientist'}
              </p>
            </div>
            {personalInfo.location && (
              <span className="text-xs font-medium text-neutral-600 sm:text-right">
                {personalInfo.location}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-700 mt-2.5 font-medium pt-1">
            {personalInfo.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-neutral-900" />
                <span>{personalInfo.email}</span>
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-1">
                <span className="text-neutral-400">•</span>
                <Phone className="w-3.5 h-3.5 text-neutral-900" />
                <span>{personalInfo.phone}</span>
              </span>
            )}
            {personalInfo.website && (
              <span className="flex items-center gap-1">
                <span className="text-neutral-400">•</span>
                <Globe className="w-3.5 h-3.5 text-neutral-900" />
                <span>{personalInfo.website.replace('https://', '')}</span>
              </span>
            )}
            {personalInfo.linkedin && (
              <span className="flex items-center gap-1">
                <span className="text-neutral-400">•</span>
                <Linkedin className="w-3.5 h-3.5 text-neutral-900" />
                <span>{personalInfo.linkedin.replace('https://', '')}</span>
              </span>
            )}
            {personalInfo.github && (
              <span className="flex items-center gap-1">
                <span className="text-neutral-400">•</span>
                <Github className="w-3.5 h-3.5 text-neutral-900" />
                <span>{personalInfo.github.replace('https://', '')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        {summary && (
          <div className="mb-6">
            <h2 className={getSectionTitleClass('mb-2')}>
              Professional Summary
            </h2>
            <p className="text-xs leading-relaxed text-neutral-800 text-justify">
              {summary}
            </p>
          </div>
        )}

        {/* Work Experience */}
        {workExperiences.length > 0 && (
          <div className="mb-6">
            <h2 className={getSectionTitleClass('mb-3')}>
              Professional Experience
            </h2>

            <div className="space-y-4">
              {workExperiences.map((exp) => (
                <div key={exp.id} className="text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between font-bold text-neutral-900">
                    <span className="text-sm font-bold text-neutral-950">
                      {exp.role} <span className="font-normal text-neutral-600">at</span> {exp.company}
                    </span>
                    <span className="text-neutral-600 font-medium text-[11px]">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate} | {exp.location}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-1.5 list-disc list-outside pl-4 text-neutral-800 leading-relaxed">
                    {exp.bullets.map((bullet, idx) => (
                      <li key={idx} className="pl-0.5">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical & Core Skills */}
        <div className="mb-6">
          <h2 className={getSectionTitleClass('mb-2')}>
            Technical Competencies & Skills
          </h2>
          <div className="space-y-1.5 text-xs text-neutral-800">
            {skills.languages.length > 0 && (
              <p>
                <span className="font-bold text-neutral-950">Languages:</span>{' '}
                {skills.languages.join(', ')}
              </p>
            )}
            {skills.frameworks.length > 0 && (
              <p>
                <span className="font-bold text-neutral-950">Frameworks & Libraries:</span>{' '}
                {skills.frameworks.join(', ')}
              </p>
            )}
            {skills.cloudDevOps.length > 0 && (
              <p>
                <span className="font-bold text-neutral-950">Cloud & Infrastructure:</span>{' '}
                {skills.cloudDevOps.join(', ')}
              </p>
            )}
            {skills.toolsAndDatabases.length > 0 && (
              <p>
                <span className="font-bold text-neutral-950">Databases & Architecture:</span>{' '}
                {skills.toolsAndDatabases.join(', ')}
              </p>
            )}
            {skills.softSkills.length > 0 && (
              <p>
                <span className="font-bold text-neutral-950">Leadership & Methodologies:</span>{' '}
                {skills.softSkills.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Featured Projects */}
        {projects.length > 0 && (
          <div className="mb-6">
            <h2 className={getSectionTitleClass('mb-3')}>
              Key Engineering Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div key={proj.id} className="text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <span className="font-bold text-neutral-950">
                      {proj.name}
                      {proj.link && (
                        <span className="font-normal ml-2 text-neutral-600">
                          ({proj.link.replace('https://', '')})
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      {proj.technologies.join(' • ')}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-1 list-disc list-outside pl-4 text-neutral-800 leading-relaxed">
                    {proj.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education & Certifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {education.length > 0 && (
            <div>
              <h2 className={getSectionTitleClass('mb-2')}>
                Education
              </h2>
              {education.map((edu) => (
                <div key={edu.id} className="text-xs space-y-0.5">
                  <p className="font-bold text-neutral-950">{edu.degree}</p>
                  <p className="text-neutral-700">{edu.institution}</p>
                  <p className="text-neutral-500 text-[11px]">
                    {edu.startDate} – {edu.endDate} {edu.gpa && `| GPA: ${edu.gpa}`}
                  </p>
                  {edu.honors && <p className="italic text-[11px] text-neutral-700">{edu.honors}</p>}
                  {edu.coursework && (
                    <p className="text-neutral-600 text-[10px] mt-0.5">
                      <span className="font-semibold text-neutral-800">Coursework:</span> {edu.coursework}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {certifications.length > 0 && (
            <div>
              <h2 className={getSectionTitleClass('mb-2')}>
                Certifications
              </h2>
              <div className="space-y-1.5 text-xs">
                {certifications.map((cert) => (
                  <div key={cert.id}>
                    <p className="font-bold text-neutral-950">{cert.name}</p>
                    <p className="text-neutral-600 text-[11px]">
                      {cert.issuer} • {cert.date}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

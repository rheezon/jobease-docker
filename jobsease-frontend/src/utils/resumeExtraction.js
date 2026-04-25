// Resume extraction utilities (PDF mock + LaTeX heuristics) and autofill mapping.

export const extractResumeData = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+1 (555) 123-4567',
        skills: 'Java, Spring Boot, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL, MongoDB',
        experience: '5 years of software development experience with focus on backend systems and microservices architecture',
        education: 'Bachelor of Science in Computer Science - Stanford University (2018)',
        summary: 'Experienced software engineer with expertise in full-stack development, cloud technologies, and agile methodologies.',
        projects: [
          'E-commerce Platform: Built scalable microservices using Spring Boot and React',
          'Cloud Migration: Migrated legacy systems to AWS with 40% performance improvement',
          'API Development: Designed RESTful APIs serving 1M+ requests daily',
        ],
        certifications: ['AWS Certified Solutions Architect', 'Certified Kubernetes Administrator'],
      };
      resolve(mockData);
    }, 1200);
  });
};

const EXPERIENCE_BANDS = [
  'Entry Level (0-2 years)',
  'Mid Level (3-5 years)',
  'Senior Level (6-10 years)',
  'Lead/Principal (10+ years)',
];

const CITY_OPTIONS = [
  'Remote',
  'Any',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Delhi',
  'Mumbai',
  'Chennai',
  'Noida',
  'Gurgaon',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
];

/** Roles shown on onboarding (subset). */
export const ONBOARDING_ROLE_OPTIONS = [
  'Machine Learning Engineer',
  'Senior Machine Learning Engineer',
  'Software Developer',
  'Backend Developer',
  'Frontend Developer',
  'Data Scientist',
  'DevOps Engineer',
  'Product Manager',
  'Project Manager',
  'Program Manager',
  'Operations Manager',
  'Engineering Manager',
  'Director of Engineering',
  'Director of Product',
  'Director of Operations',
  'General Manager',
  'Chief of Staff',
  'HR Manager',
  'Talent Acquisition Specialist',
  'Marketing Manager',
  'Sales Manager',
  'Customer Success Manager',
  'Finance Manager',
  'Cybersecurity Analyst',
  'Security Engineer',
  'Penetration Tester',
  'SOC Analyst',
  'Cloud Security Engineer',
];

/** Broader list for Create Notifier + fuzzy match. */
export const NOTIFIER_ROLE_OPTIONS = [
  'Machine Learning Engineer',
  'Senior Machine Learning Engineer',
  'Software Developer',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Mobile Developer (Android)',
  'Mobile Developer (iOS)',
  'Data Scientist',
  'Data Engineer',
  'MLOps Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'QA Engineer',
  'Blockchain Developer',
  'AI Engineer',
  'Data Analyst',
  'Business Analyst',
  'UI/UX Designer',
  'Product Designer',
  'Product Manager',
  'Project Manager',
  'Program Manager',
  'Operations Manager',
  'Engineering Manager',
  'Senior Engineering Manager',
  'Director of Engineering',
  'Director of Product',
  'Director of Operations',
  'General Manager',
  'Chief of Staff',
  'HR Manager',
  'Talent Acquisition Specialist',
  'Marketing Manager',
  'Sales Manager',
  'Customer Success Manager',
  'Finance Manager',
  'Cybersecurity Analyst',
  'Security Engineer',
  'Penetration Tester',
  'SOC Analyst',
  'Cloud Security Engineer',
  'Intern',
];

export function inferExperienceBand(text) {
  const s = (text || '').toLowerCase();
  if (/\b(10\+|12\+|15\+|principal|director|vp|executive)\b/.test(s) || /\b(10|11|12|15)\s*(\+)?\s*years?\b/.test(s)) {
    return EXPERIENCE_BANDS[3];
  }
  if (/\b(6|7|8|9)\s*(\+)?\s*years?\b/.test(s) || /\b(senior|staff|lead)\b/.test(s)) {
    return EXPERIENCE_BANDS[2];
  }
  if (/\b(3|4|5)\s*(\+)?\s*years?\b/.test(s) || /\bmid\b/.test(s)) {
    return EXPERIENCE_BANDS[1];
  }
  if (/\b(0|1|2)\s*(\+)?\s*years?\b/.test(s) || /\b(entry|junior|intern|graduate)\b/.test(s)) {
    return EXPERIENCE_BANDS[0];
  }
  if (/\b5\s*years?\b/.test(s)) return EXPERIENCE_BANDS[1];
  return '';
}

export function inferCityFromText(text) {
  const s = (text || '').toLowerCase();
  for (const c of CITY_OPTIONS) {
    if (c === 'Any' || c === 'Remote') continue;
    if (s.includes(c.toLowerCase())) return c;
  }
  if (/\bremote\b/.test(s)) return 'Remote';
  return '';
}

export function matchRoleFromText(text, roleOptions) {
  const s = (text || '').toLowerCase();
  let best = '';
  let bestScore = 0;
  for (const role of roleOptions) {
    const r = role.toLowerCase();
    const words = r.split(/\s+/).filter(Boolean);
    let score = 0;
    for (const w of words) {
      if (w.length > 2 && s.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = role;
    }
  }
  return bestScore > 0 ? best : '';
}

export function coerceRoleForOnboarding(role) {
  if (!role) return '';
  if (ONBOARDING_ROLE_OPTIONS.includes(role)) return role;
  const m = matchRoleFromText(role, ONBOARDING_ROLE_OPTIONS);
  return m || '';
}

export function skillsCsvToArray(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  return String(skills)
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Section titles that usually contain skills / tech stack in LaTeX resumes. */
const LATEX_SKILLS_SECTION_TITLE =
  /\b(skills?|technical\s*skills?|programming\s*languages?|languages?|technologies|technolog(y|ies)|frameworks?|tools?\s*(and|&)?\s*technologies?|tech\s*stack|stack|expertise|libraries|platforms?|core\s*competen(cy|cies)|software|proficien(cy|cies))\b/i;

/**
 * Pull skill-like tokens from a LaTeX fragment (section body or line).
 * @param {string} chunk
 * @returns {string[]}
 */
function skillsFromLatexChunk(chunk) {
  if (!chunk || typeof chunk !== 'string') return [];
  const out = [];
  let s = chunk
    .replace(/\\texttt\{([^}]*)\}/gi, '$1')
    .replace(/\\textbf\{([^}]*)\}/gi, '$1')
    .replace(/\\textit\{([^}]*)\}/gi, '$1')
    .replace(/\\emph\{([^}]*)\}/gi, '$1')
    .replace(/\\underline\{([^}]*)\}/gi, '$1')
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/gi, '$1')
    .replace(/\\\\/g, ',')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, ' ')
    .replace(/[{}$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || s.length > 600) return [];
  const parts = s.split(/[,;|·•]|(?:\s+\/\s+)|(?:\s{2,})/g);
  for (const p of parts) {
    const y = p.replace(/^[\s\-–:]+|[\s\-–]+$/g, '').trim();
    if (y.length < 2 || y.length > 72) continue;
    if (/^(and|or|the|etc\.?)$/i.test(y)) continue;
    if (/^[\d\s.+]+$/.test(y)) continue;
    out.push(y);
  }
  return out;
}

/**
 * Best-effort skills list from common LaTeX resume layouts (Jake / Deedy / article / itemize / \\textbf{Cat}{: ...}).
 * @param {string} latex
 * @returns {string[]} deduped, order preserved
 */
export function extractSkillsFromLatex(latex) {
  const t = latex || '';
  const seen = new Set();
  const ordered = [];

  const push = (arr) => {
    for (const raw of arr) {
      const x = String(raw || '').trim();
      if (!x) continue;
      const key = x.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(x);
    }
  };

  // --- Section-based (Skills, Technical Skills, Programming Languages, …) ---
  const sectionRe = /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section|$)/gi;
  let sm;
  while ((sm = sectionRe.exec(t)) !== null) {
    const title = sm[1].trim();
    if (!LATEX_SKILLS_SECTION_TITLE.test(title)) continue;
    const body = sm[2];
    extractSkillTokensFromSectionBody(body, push);
  }

  // --- Whole-document fallbacks (often outside a titled "Skills" section) ---
  let lm;
  const langLine = /\\textbf\s*\{\s*Languages?\s*\}\s*\{:\s*([^}]+)\}/gi;
  while ((lm = langLine.exec(t)) !== null) {
    push(skillsFromLatexChunk(lm[1]));
  }

  // moderncv-style
  const cvSkills = /\\cvitem\*?\s*\{\s*Skills?\s*\}\s*\{([^}]*)\}/gi;
  while ((lm = cvSkills.exec(t)) !== null) {
    push(skillsFromLatexChunk(lm[1]));
  }

  const keywordsBlock = /\\keywords\s*\{([^}]+)\}/gi;
  while ((lm = keywordsBlock.exec(t)) !== null) {
    push(skillsFromLatexChunk(lm[1]));
  }

  // \subsection{Skills} … (same body patterns)
  const subRe = /\\subsection\*?\{([^}]+)\}([\s\S]*?)(?=\\(?:sub)?section|$)/gi;
  while ((sm = subRe.exec(t)) !== null) {
    if (!LATEX_SKILLS_SECTION_TITLE.test(sm[1].trim())) continue;
    extractSkillTokensFromSectionBody(sm[2], push);
  }

  return ordered;
}

function extractSkillTokensFromSectionBody(body, push) {
  let bm;
  const reBoldColon = /\\textbf\s*\{[^}]+\}\s*\{:\s*([^}]+)\}/gi;
  while ((bm = reBoldColon.exec(body)) !== null) {
    push(skillsFromLatexChunk(bm[1]));
  }
  const reBoldLabel = /\\textbf\s*\{\s*([^:}]+)\s*:\s*\}\s*([^\n\\]+)/gi;
  while ((bm = reBoldLabel.exec(body)) !== null) {
    push(skillsFromLatexChunk(bm[2]));
  }
  const reItemBraced = /\\item\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/gi;
  while ((bm = reItemBraced.exec(body)) !== null) {
    push(skillsFromLatexChunk(bm[1]));
  }
  const reItemPlain = /\\item\s*(?:\[[^\]]*\])?\s+([^\n\\]+?)(?=\s*\\\\|\s*\\item|\s*\\end\b)/gi;
  while ((bm = reItemPlain.exec(body)) !== null) {
    push(skillsFromLatexChunk(bm[1]));
  }
  const deTeX = body
    .replace(/\\textbf\s*\{[^}]+\}\s*\{:\s*[^}]+\}/gi, ' ')
    .replace(/\\item[^\n]*/gi, ' ')
    .replace(/\\begin\{[^}]+\}(?:\[[^\]]*\])?/gi, ' ')
    .replace(/\\end\{[^}]+\}/gi, ' ')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, ' ')
    .replace(/[{}]/g, ' ');
  push(skillsFromLatexChunk(deTeX));
}

/**
 * Best-effort parse of common LaTeX resume templates for autofill.
 * Returns the same shape as formatResumeData output + raw latex in resumeLatex.
 */
export function parseLatexResumeHeuristic(latex) {
  const t = latex || '';
  let name = '';
  const namePatterns = [
    /\\textbf\s*\{\\Huge(?:\\scshape)?\s*([^}]+)\}/i,
    /\\textbf\s*\{\\Huge\s*\\scshape\s*([^}]+)\}/i,
    /\\name\s*\{([^}]+)\}/i,
  ];
  for (const re of namePatterns) {
    const m = t.match(re);
    if (m?.[1]) {
      name = m[1].replace(/\\\\/g, '\\').trim();
      break;
    }
  }

  let email = '';
  const em = t.match(/mailto:([^}\s"]+)/i);
  if (em) email = em[1].trim();

  let phone = '';
  const phoneBlock = t.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/i);
  if (phoneBlock) {
    const inner = phoneBlock[1];
    const pm = inner.match(/(\+?\d[\d\s().-]{8,}\d)/);
    if (pm) phone = pm[1].trim();
  }

  const skillsList = extractSkillsFromLatex(t);
  const skills = skillsList.join(', ');

  let experience = '';
  const ex = t.match(/\\section\{Experience\}([\s\S]*?)(?=\\section|$)/i);
  if (ex) experience = ex[1].replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
  if (!experience) {
    const sm = t.match(/\\section\{Professional Summary\}([\s\S]*?)(?=\\section|$)/i);
    if (sm) experience = sm[1].replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
  }

  let education = '';
  const ed = t.match(/\\section\{Education\}([\s\S]*?)(?=\\section|$)/i);
  if (ed) education = ed[1].replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);

  const summary = '';
  const blob = `${t.slice(0, 4000)}`;
  const inferredRole = matchRoleFromText(blob, NOTIFIER_ROLE_OPTIONS);

  return formatResumeData({
    name,
    email,
    phone,
    skills,
    experience: experience || summary,
    education,
    summary,
    projects: [],
    certifications: [],
    _inferredRole: inferredRole,
    _rawLatex: latex,
  });
}

export function formatResumeData(data) {
  return {
    name: data.name?.trim() || '',
    email: data.email?.trim() || '',
    phone: data.phone?.trim() || '',
    skills: data.skills?.trim() || '',
    experience: data.experience?.trim() || '',
    education: data.education?.trim() || '',
    summary: data.summary?.trim() || '',
    projects: data.projects || [],
    certifications: data.certifications || [],
    _inferredRole: data._inferredRole ?? '',
    _rawLatex: data._rawLatex ?? '',
  };
}

/** One education row for onboarding from free-text education line. */
export function educationTextToRow(educationText) {
  const text = (educationText || '').trim();
  let batchPassout = '';
  const y = text.match(/\b(19|20)\d{2}\b/);
  if (y) batchPassout = y[0];

  let degreeName = 'Other';
  let degreeCustom = text.slice(0, 200) || 'Degree';
  const lower = text.toLowerCase();
  const degreeKeywords = [
    ['B.Tech', 'B.Tech'],
    ['B.E.', 'B.E.'],
    ['M.Tech', 'M.Tech'],
    ['M.E.', 'M.E.'],
    ['BCA', 'BCA'],
    ['MCA', 'MCA'],
    ['B.Sc', 'B.Sc'],
    ['M.Sc', 'M.Sc'],
    ['B.Com', 'B.Com'],
    ['M.Com', 'M.Com'],
    ['BBA', 'BBA'],
    ['MBA', 'MBA'],
    ['PhD', 'PhD'],
    ['Ph.D', 'PhD'],
    ['Diploma', 'Diploma'],
  ];
  for (const [needle, opt] of degreeKeywords) {
    if (lower.includes(needle.toLowerCase())) {
      degreeName = opt;
      degreeCustom = '';
      break;
    }
  }

  let major = 'Computer Science';
  const majorMatch = text.match(/(?:in|,)\s*([A-Za-z][A-Za-z\s&]{2,40}?)(?:\s*[-,(]|$)/i);
  if (majorMatch) major = majorMatch[1].trim();

  return {
    degreeName,
    degreeCustom,
    collegeType: 'Tier2',
    batchPassout: batchPassout || String(new Date().getFullYear() - 2),
    major,
  };
}

function truncateNotifierName(s, max) {
  const t = String(s || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.45 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[,\s]+$/g, '')}…`;
}

/**
 * Autofill notifier name: "{Job role} Notifier" using the matched job role.
 * If role is empty, infers a role from resume skills text (word overlap with role lists).
 * @param {string[]} skillsArr
 * @param {string} role
 * @param {{ firstNameFromResume?: string, userFirstName?: string, variant?: 'onboarding' | 'create' }} [ctx]
 */
export function buildSuggestedJobNotifierName(skillsArr, role, ctx = {}) {
  const { firstNameFromResume = '', userFirstName = '', variant = 'create' } = ctx;

  let r = String(role || '').trim();

  if (!r) {
    const skillBlob = (skillsArr || []).filter(Boolean).join(' ');
    if (skillBlob) {
      if (variant === 'onboarding') {
        const raw =
          matchRoleFromText(skillBlob, ONBOARDING_ROLE_OPTIONS) ||
          matchRoleFromText(skillBlob, NOTIFIER_ROLE_OPTIONS);
        r = coerceRoleForOnboarding(raw);
      } else {
        r = matchRoleFromText(skillBlob, NOTIFIER_ROLE_OPTIONS) || '';
      }
    }
  }

  if (r) {
    return truncateNotifierName(`${r} Notifier`, 88);
  }

  const fn = String(firstNameFromResume || userFirstName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  if (fn) {
    return truncateNotifierName(`${fn} Notifier`, 88);
  }

  return 'My Notifier';
}

export function buildOnboardingAutofill(formatted, user) {
  const skillsArr = skillsCsvToArray(formatted.skills);
  const expBand = inferExperienceBand(`${formatted.experience} ${formatted.summary}`);
  const city = inferCityFromText(`${formatted.experience} ${formatted.education} ${formatted.summary}`);
  const role = coerceRoleForOnboarding(formatted._inferredRole || matchRoleFromText(`${formatted.experience} ${formatted.summary}`, ONBOARDING_ROLE_OPTIONS));
  const resumeFirst = formatted.name ? String(formatted.name).split(/\s+/).filter(Boolean)[0] : '';
  const userFirst = user?.fullName ? String(user.fullName).split(/\s+/).filter(Boolean)[0] : '';
  const notifierName = buildSuggestedJobNotifierName(skillsArr, role, {
    firstNameFromResume: resumeFirst,
    userFirstName: userFirst,
    variant: 'onboarding',
  });
  const eduRow = educationTextToRow(formatted.education);

  const resumeLatex = formatted._rawLatex || generateLatexFromData(formatted);

  return {
    formData: {
      fullName: formatted.name || user?.fullName || '',
      email: user?.email || formatted.email || '',
      phone: formatted.phone || '',
      location: city || '',
      experience: expBand || '',
      skills: skillsArr,
      salaryExpectation: '',
      role: role || '',
      notifierName,
      companiesPreference: '',
      noticePeriod: '',
      additionalPreferencesText: [formatted.summary, ...(formatted.projects || []).slice(0, 2)].filter(Boolean).join('\n\n'),
      resumeLatex,
    },
    educationDetails: [eduRow],
  };
}

export function buildCreateNotifierAutofill(formatted, user, opts = {}) {
  const skillsArr = skillsCsvToArray(formatted.skills);
  const expBand = inferExperienceBand(`${formatted.experience} ${formatted.summary}`);
  const city = inferCityFromText(`${formatted.experience} ${formatted.education} ${formatted.summary}`);
  const role =
    formatted._inferredRole ||
    matchRoleFromText(`${formatted.experience} ${formatted.summary}`, NOTIFIER_ROLE_OPTIONS);
  const resumeLatex = formatted._rawLatex || generateLatexFromData(formatted);

  const resumeFirst = formatted.name ? String(formatted.name).split(/\s+/).filter(Boolean)[0] : '';
  const userFirst = user?.fullName ? String(user.fullName).split(/\s+/).filter(Boolean)[0] : '';
  const nm = buildSuggestedJobNotifierName(skillsArr, role || '', {
    firstNameFromResume: resumeFirst,
    userFirstName: userFirst,
    variant: 'create',
  });

  return {
    setValue: {
      role: role || '',
      city: city || '',
      experience: expBand || '',
      salaryExpectation: '',
      noticePeriod: '',
      companiesPreference: '',
      additionalPreferences: [formatted.summary, ...(formatted.projects || []).slice(0, 2)].filter(Boolean).join('\n\n'),
      resumeLatex,
      name: nm,
    },
    skills: skillsArr,
    resumeFileName: opts.resumeFileName ?? (formatted._rawLatex ? '' : 'resume-from-upload.pdf'),
  };
}

export const generateLatexFromData = (data) => {
  const safe = (v) => String(v || '').replace(/\\/g, '\\textbackslash{}').replace(/#/g, '\\#');
  const dataSafe = {
    name: safe(data.name),
    email: safe(data.email),
    phone: safe(data.phone),
    skills: safe(data.skills),
    experience: safe(data.experience),
    education: safe(data.education),
    summary: safe(data.summary),
    projects: data.projects || [],
    certifications: data.certifications || [],
  };

  const latexTemplate = `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${dataSafe.name}} \\\\ \\vspace{1pt}
    \\small ${dataSafe.phone} $|$ \\href{mailto:${data.email || 'email@example.com'}}{\\underline{${data.email || 'email@example.com'}}}
\\end{center}

\\section{Professional Summary}
${dataSafe.summary || 'Experienced professional.'}

\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {${dataSafe.education || 'Education'}}{}
      {}{}
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Professional Experience}{}
      {}{}
      \\resumeItemListStart
        \\resumeItem{${dataSafe.experience || 'See profile.'}}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: ${dataSafe.skills || 'Various'}} \\\\
    }}
 \\end{itemize}

\\end{document}`;

  return latexTemplate;
};

export const validateResumeData = (data) => {
  const errors = [];
  if (!data.name || data.name.trim() === '') errors.push('Name is required');
  if (!data.email || data.email.trim() === '') errors.push('Email is required');
  else if (!/\S+@\S+\.\S+/.test(data.email)) errors.push('Email format is invalid');
  if (!data.skills || data.skills.trim() === '') errors.push('Skills are required');
  if (!data.experience || data.experience.trim() === '') errors.push('Experience description is required');
  return { isValid: errors.length === 0, errors };
};

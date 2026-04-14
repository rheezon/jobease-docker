// Resume extraction utilities
export const extractResumeData = async (file) => {
  // This is a mock implementation
  // In a real application, you would integrate with a PDF parsing library
  // or send the file to a backend service for processing
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock extracted data - replace with actual extraction logic
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
          'API Development: Designed RESTful APIs serving 1M+ requests daily'
        ],
        certifications: [
          'AWS Certified Solutions Architect',
          'Certified Kubernetes Administrator'
        ]
      };
      
      resolve(mockData);
    }, 1500); // Simulate processing time
  });
};

export const generateLatexFromData = (data) => {
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
    \\textbf{\\Huge \\scshape ${data.name}} \\\\ \\vspace{1pt}
    \\small ${data.phone} $|$ \\href{mailto:${data.email}}{\\underline{${data.email}}}
\\end{center}

\\section{Professional Summary}
${data.summary || 'Experienced software engineer with expertise in full-stack development and cloud technologies.'}

\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {${data.education || 'Bachelor of Science in Computer Science'}}{}
      {}{}
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Software Engineer}{}
      {Company Name}{}
      \\resumeItemListStart
        \\resumeItem{${data.experience || '5 years of software development experience'}}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: ${data.skills || 'Java, Python, JavaScript, SQL'}} \\\\
     \\textbf{Frameworks}{: Spring Boot, React, Node.js} \\\\
     \\textbf{Tools}{: Git, Docker, AWS, Jenkins}
    }}
 \\end{itemize}

${data.projects && data.projects.length > 0 ? `
\\section{Key Projects}
  \\resumeSubHeadingListStart
${data.projects.map(project => `
    \\resumeSubheading
      {${project.split(':')[0]}}{}
      {${project.split(':')[1] || ''}}{}
`).join('')}
  \\resumeSubHeadingListEnd
` : ''}

${data.certifications && data.certifications.length > 0 ? `
\\section{Certifications}
 \\begin{itemize}[leftmargin=0.15in, label={}]
${data.certifications.map(cert => `
    \\small{\\item{${cert}}}
`).join('')}
 \\end{itemize}
` : ''}

\\end{document}`;

  return latexTemplate;
};

export const validateResumeData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('Email format is invalid');
  }
  
  if (!data.skills || data.skills.trim() === '') {
    errors.push('Skills are required');
  }
  
  if (!data.experience || data.experience.trim() === '') {
    errors.push('Experience description is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatResumeData = (data) => {
  return {
    name: data.name?.trim() || '',
    email: data.email?.trim() || '',
    phone: data.phone?.trim() || '',
    skills: data.skills?.trim() || '',
    experience: data.experience?.trim() || '',
    education: data.education?.trim() || '',
    summary: data.summary?.trim() || '',
    projects: data.projects || [],
    certifications: data.certifications || []
  };
};

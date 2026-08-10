import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Briefcase, Zap, Bell, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: Briefcase,
    title: 'Welcome to JobKick!',
    subtitle: 'Your intelligent job notification platform',
    description: 'We help you find the right opportunities by monitoring job postings and matching them to your preferences — automatically.',
  },
  {
    icon: Zap,
    title: "Let's set up your first notifier",
    subtitle: "It takes less than 2 minutes",
    description: "Tell us your preferred role, skills, and location. We'll handle the rest — scanning jobs, scoring relevance, and even tailoring your resume.",
  },
  {
    icon: Bell,
    title: 'Sit back and get notified',
    subtitle: "We'll do the heavy lifting",
    description: "Once your notifier is active, you'll receive matched jobs with relevance scores delivered straight to your dashboard and email.",
  },
];

const Welcome = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/onboarding');
    }
  };

  const handleSkip = () => {
    navigate('/onboarding');
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        {/* Progress dots */}
        <div className="welcome-progress">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`welcome-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="welcome-icon">
          <Icon size={40} />
        </div>

        {/* Content */}
        <h1 className="welcome-title">
          {currentStep === 0 && user?.fullName
            ? `Welcome, ${user.fullName.split(' ')[0]}!`
            : step.title}
        </h1>
        <p className="welcome-subtitle">{step.subtitle}</p>
        <p className="welcome-description">{step.description}</p>

        {/* Actions */}
        <div className="welcome-actions">
          <button className="welcome-next-btn" onClick={handleNext}>
            {isLast ? "Get Started" : "Next"}
            <ChevronRight size={18} />
          </button>
        </div>

        {!isLast && (
          <button className="welcome-skip-btn" onClick={handleSkip}>
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
};

export default Welcome;

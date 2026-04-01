import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  organization: string;
  quote: string;
  rating: number;
  initials: string;
  bgColor: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Erik Larsson',
    role: 'Skogsägare',
    organization: 'Larsson Estate (500 ha)',
    quote: 'BeetleSense detected an outbreak 3 weeks before traditional monitoring would have caught it. Saved us thousands in timber loss.',
    rating: 5,
    initials: 'EL',
    bgColor: 'bg-emerald-600',
  },
  {
    id: 2,
    name: 'Ingrid Svensson',
    role: 'Kommunal Skogschef',
    organization: 'Värmland Municipality',
    quote: 'Reduced our inspection costs by 40% in the first season. The precision alerts mean we focus on real threats, not false alarms.',
    rating: 5,
    initials: 'IS',
    bgColor: 'bg-blue-600',
  },
  {
    id: 3,
    name: 'Dr. Hans Bergström',
    role: 'Grant Evaluator',
    organization: 'EU FORWARDS Programme',
    quote: 'Exactly the kind of AI innovation FORWARDS is designed to fund. Real-world impact + scalable + measurable sustainability outcomes.',
    rating: 5,
    initials: 'HB',
    bgColor: 'bg-purple-600',
  },
  {
    id: 4,
    name: 'Sofia Eklund',
    role: 'Conservation Researcher',
    organization: 'Swedish University of Agricultural Sciences',
    quote: 'The carbon impact data is invaluable for our sustainability reports. Finally, forest health + emissions tracking in one platform.',
    rating: 5,
    initials: 'SE',
    bgColor: 'bg-amber-600',
  },
];

const stats = [
  { label: 'Hectares Monitored', value: '2,500+', highlight: 'emerald' },
  { label: 'Early Detections', value: '47', highlight: 'blue' },
  { label: 'Timber Saved', value: '€2.1M', highlight: 'amber' },
  { label: 'Municipalities', value: '12', highlight: 'purple' },
];

const SocialProof: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-rotate on mobile
  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isMobile]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
    );
  };

  return (
    <section className="mt-8 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-lg p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">
          Trusted by Forest Professionals Across Scandinavia
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Real stories from foresters, municipalities, and conservation experts who rely on BeetleSense.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-lg p-4 border border-gray-700 bg-gray-800/50 text-center`}
          >
            <div
              className={`text-2xl font-bold mb-1 ${
                stat.highlight === 'emerald'
                  ? 'text-emerald-400'
                  : stat.highlight === 'blue'
                  ? 'text-blue-400'
                  : stat.highlight === 'amber'
                  ? 'text-amber-400'
                  : 'text-purple-400'
              }`}
            >
              {stat.value}
            </div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Testimonials */}
      {isMobile ? (
        // Mobile Carousel
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-4"
            >
              <TestimonialCard testimonial={testimonials[currentIndex]} renderStars={renderStars} />
            </motion.div>
          </AnimatePresence>

          {/* Mobile Navigation */}
          <div className="flex items-center justify-between gap-3 mt-6">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition ${
                    i === currentIndex ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        // Desktop Grid
        <div className="grid grid-cols-2 gap-4">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <TestimonialCard testimonial={testimonial} renderStars={renderStars} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

interface TestimonialCardProps {
  testimonial: Testimonial;
  renderStars: (count: number) => React.ReactNode;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial, renderStars }) => {
  return (
    <div className="border border-gray-700 rounded-lg p-5 bg-gray-800/30 hover:bg-gray-800/50 transition">
      {/* Avatar + Info */}
      <div className="flex items-start gap-4 mb-3">
        <div className={`w-10 h-10 rounded-full ${testimonial.bgColor} flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm`}>
          {testimonial.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{testimonial.name}</div>
          <div className="text-xs text-gray-400 truncate">{testimonial.role}</div>
          <div className="text-xs text-gray-500 truncate">{testimonial.organization}</div>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-3">{renderStars(testimonial.rating)}</div>

      {/* Quote */}
      <p className="text-sm text-gray-300 leading-relaxed italic">"{testimonial.quote}"</p>
    </div>
  );
};

export default SocialProof;

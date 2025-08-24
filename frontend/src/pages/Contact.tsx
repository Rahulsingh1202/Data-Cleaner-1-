import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, Github, Linkedin, Code, Coffee, Heart } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    try {
      // In a real application, you would send this to your backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted:', formData);
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setSubmitted(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: ''
      });
      
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6 text-blue-500" />,
      title: "Email Us",
      details: "rahulsingh12022002@gmail.com",
      description: "We typically respond within 24 hours"
    },
    {
      icon: <Phone className="w-6 h-6 text-green-500" />,
      title: "Call Us",
      details: "+91 6390864564",
      description: "Monday to Friday, 9 AM to 6 PM EST"
    },
    {
      icon: <MapPin className="w-6 h-6 text-purple-500" />,
      title: "Visit Us",
      details: "126 Hinjewadi, Pune, Maharashtra ",
      description: "Our headquarters and development team"
    }
  ];

  const faqs = [
    {
      question: "What file formats are supported?",
      answer: "We support ZIP archives containing images in JPG, PNG, BMP, TIFF, and WebP formats."
    },
    {
      question: "How long does processing take?",
      answer: "Processing time depends on dataset size. Typically 2-10 minutes for datasets up to 1GB."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, all uploads are encrypted and automatically deleted after 7 days. We never store your images permanently."
    },
    {
      question: "Can I use this for commercial projects?",
      answer: "Absolutely! Our service is designed for both personal and commercial machine learning projects."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Toaster position="top-right" />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions about our dataset cleaning service? Need help with your ML project? 
            We're here to help you succeed.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2 space-y-8">
              <div className="card">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Send Us a Message
                </h2>

                {submitted && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-green-800">Message sent successfully! We'll get back to you soon.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company/Organization
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Your company or organization"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="enterprise">Enterprise Solutions</option>
                      <option value="partnership">Partnership Opportunity</option>
                      <option value="feedback">Feedback & Suggestions</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="input-field resize-none"
                      placeholder="Tell us how we can help you..."
                    ></textarea>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto btn-primary flex items-center justify-center px-8 py-3 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* About the Developer Card */}
              <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    About the Developer
                  </h2>
                  
                  {/* Profile Image Placeholder */}
                  <div className="flex justify-center mb-4">
                    <img 
                      src={require('./profileji.jpg')} 
                      alt="Rahul Singh"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  </div>

                  {/* Developer Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Rahul Singh
                      </h3>
                      <p className="text-lg text-blue-600 font-medium">
                        AI & ML Engineer
                      </p>
                    </div>

                    <div className="max-w-md mx-auto">
                      <p className="text-gray-700 leading-relaxed">
                        Passionate about building AI-powered solutions that solve real-world problems. 
                        With expertise in machine learning, computer vision, and full-stack development, 
                        I created Dataset Cleaner to help ML engineers prepare better training data.
                      </p>
                    </div>

                    {/* Skills/Technologies */}
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      {['Python', 'FastAPI', 'React', 'TypeScript', 'Machine Learning', 'Computer Vision', 'Docker', 'AWS'].map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Social Links */}
                    <div className="flex justify-center space-x-6 pt-6">
                      <a
                        href="https://github.com/Rahulsingh1202"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <Github className="w-5 h-5" />
                        <span>GitHub</span>
                      </a>
                      <a
                        href="https://www.linkedin.com/in/rahulsingh1202"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Linkedin className="w-5 h-5" />
                        <span>LinkedIn</span>
                      </a>
                      <a
                        href="mailto:rahulsingh12022002@gmail.com"
                        className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        <span>Email</span>
                      </a>
                    </div>

                    {/* Fun Fact */}
                    <div className="bg-white rounded-lg p-4 mt-6">
                      <div className="flex items-center justify-center space-x-2 text-gray-600">
                        <Coffee className="w-4 h-4" />
                        <span className="text-sm">Powered by coffee and passion for clean code</span>
                        <Heart className="w-4 h-4 text-red-500" />
                      </div>
                    </div>

                    {/* Call to Action */}
                    <div className="pt-4">
                      <p className="text-gray-600 mb-4">
                        Got ideas for new features or want to collaborate? Let's connect!
                      </p>
                      <button
                        onClick={() => {
                          const messageInput = document.getElementById('message') as HTMLTextAreaElement;
                          if (messageInput) {
                            messageInput.value = "Hi! I'd love to connect and discuss potential collaboration opportunities.";
                            messageInput.focus();
                            messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className="btn-primary"
                      >
                        Let's Collaborate! 🚀
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info & FAQ */}
            <div className="space-y-8">
              {/* Contact Information */}
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Contact Information
                </h3>
                
                <div className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        {info.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {info.title}
                        </h4>
                        <p className="text-gray-700 font-medium mb-1">
                          {info.details}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Frequently Asked Questions
                </h3>
                
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {faq.question}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="card bg-red-50 border-red-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">
                      Urgent Technical Issues?
                    </h4>
                    <p className="text-red-800 text-sm mb-2">
                      If you're experiencing critical issues with dataset processing, contact our emergency support:
                    </p>
                    <p className="text-red-900 font-medium">
                      emergency@datasetcleaner.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

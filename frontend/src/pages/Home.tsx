import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  BarChart3,
  Upload,
  Download,
  Settings
} from 'lucide-react';

const Home: React.FC = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: "AI-Powered Cleaning",
      description: "Advanced machine learning algorithms automatically detect and remove duplicates, blurry images, and corrupted files from your dataset."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-green-500" />,
      title: "Quality Filtering",
      description: "Multiple quality modes (strict, balanced, lenient) to match your specific requirements and use case needs."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
      title: "Smart Analytics",
      description: "Get detailed reports on dataset composition, removed items, and quality improvements after processing."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Upload Dataset",
      description: "Upload your image dataset as a ZIP file or individual images. We support all major formats including JPG, PNG, WebP, and more.",
      icon: <Upload className="w-6 h-6" />
    },
    {
      number: "02",
      title: "Choose Quality Mode",
      description: "Select from strict, balanced, or lenient cleaning modes based on your needs. Each mode offers different retention rates.",
      icon: <Settings className="w-6 h-6" />
    },
    {
      number: "03",
      title: "Download Results",
      description: "Get your cleaned dataset ready for machine learning training. Download includes detailed processing reports.",
      icon: <Download className="w-6 h-6" />
    }
  ];

  const stats = [
    { number: "1GB", label: "Max File Size" },
    { number: "95%", label: "Average Quality Retention" },
    { number: "3", label: "Quality Modes" },
    { number: "6+", label: "Supported Formats" }
  ];

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Clean Your Image Datasets
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Like a Pro
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Remove duplicates, filter low-quality images, and optimize your datasets 
              for machine learning with our AI-powered cleaning system.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/system"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Cleaning Dataset
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Get Support
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Dataset Cleaner?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built by an ML engineer for ML engineers. Get production-ready datasets 
              with advanced AI-powered cleaning algorithms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center p-8 hover:shadow-xl transition-shadow duration-300">
                <div className="flex justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get your cleaned dataset in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col md:flex-row items-center mb-12 last:mb-0">
                <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>
                
                <div className="flex-grow text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-4">
                      {step.icon}
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              to="/system"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Try It Now - It's Free!
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Perfect for Every Use Case
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                  For Machine Learning Engineers
                </h3>
                <ul className="space-y-4">
                  {[
                    "Improve model accuracy with cleaner training data",
                    "Reduce overfitting by removing duplicates",
                    "Speed up training with optimized datasets",
                    "Get detailed quality reports and statistics"
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                  For Data Scientists
                </h3>
                <ul className="space-y-4">
                  {[
                    "Automated quality assessment and filtering",
                    "Batch processing for large datasets",
                    "Multiple output formats for different frameworks",
                    "Preserve metadata and folder structures"
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Clean Your Dataset?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of ML engineers who trust our platform to prepare 
            their training data. Start cleaning your datasets today!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/system"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-white text-purple-600 hover:bg-gray-100 transition-all duration-200 shadow-lg"
            >
              Start Cleaning Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl border-2 border-white text-white hover:bg-white hover:text-purple-600 transition-all duration-200"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

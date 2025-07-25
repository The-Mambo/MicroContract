import React, { useState } from 'react';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle, Download, Star, Users, ArrowRight, User, LogOut } from 'lucide-react';
import { analyzeContract, extractTextFromFile, type RiskItem, type AnalysisResult } from './services/contractAnalyzer';
import { generateAnalysisReport, downloadTextFile, generateRevisedContract } from './services/exportService';
import { stripeProducts, formatPrice, type StripeProduct } from './stripe-config';
import { AuthModal } from './components/AuthModal';
import { SuccessPage } from './components/SuccessPage';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { createCheckoutSession } from './services/subscriptionService';
import { signOut } from './services/authService';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'upload' | 'analysis' | 'compare' | 'pricing' | 'success'>('landing');
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({ isOpen: false, mode: 'signin' });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [originalContractText, setOriginalContractText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedAt, setUploadedAt] = useState<Date>(new Date());
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const { subscription, orders, loading: subscriptionLoading } = useSubscription();


  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setUploadedFileName(file.name);
    setUploadedAt(new Date());
    setCurrentView('analysis');
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Extract text from the uploaded file
      const contractText = await extractTextFromFile(file);
      setOriginalContractText(contractText);
      
      if (!contractText || contractText.trim().length < 100) {
        throw new Error('Unable to extract sufficient text from the file. Please ensure the file contains readable contract text.');
      }
      
      // Analyze the contract with AI
      const result = await analyzeContract(contractText);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'An error occurred during analysis');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportReport = () => {
    if (!analysisResult) return;
    
    const report = generateAnalysisReport({
      fileName: uploadedFileName,
      analysisResult: {
        ...analysisResult,
        fileName: uploadedFileName
      },
      originalText: originalContractText,
      uploadedAt
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const safeFileName = uploadedFileName.replace(/[^a-zA-Z0-9]/g, '_');
    downloadTextFile(report, `ContractGuard_Analysis_${safeFileName}_${timestamp}.txt`);
  };

  const handleExportRevised = () => {
    if (!analysisResult || !originalContractText) return;
    
    const revisedContract = generateRevisedContract(originalContractText, {
      ...analysisResult,
      fileName: uploadedFileName
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const safeFileName = uploadedFileName.replace(/[^a-zA-Z0-9]/g, '_');
    downloadTextFile(revisedContract, `ContractGuard_Revised_${safeFileName}_${timestamp}.txt`);
  };

  const handleProductSelection = async (productId: string) => {
    const product = stripeProducts.find(p => p.id === productId);
    if (!product) return;

    // Check if user is authenticated
    if (!user) {
      setAuthModal({ isOpen: true, mode: 'signin' });
      return;
    }

    setSelectedProduct(productId);
    setIsProcessingPayment(true);

    try {
      const successUrl = `${window.location.origin}?view=success&plan=${productId}`;
      const cancelUrl = `${window.location.origin}?view=pricing`;
      
      const { url } = await createCheckoutSession(
        product.priceId,
        product.mode,
        successUrl,
        cancelUrl
      );
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
      setSelectedProduct(null);
    }
  };

  const handleFreeAccess = () => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: 'signin' });
    } else {
      setCurrentView('upload');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentView('landing');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Check URL parameters for success page
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    
    if (view === 'success') {
      setCurrentView('success');
    }
  }, []);

  const getActiveSubscription = () => {
    if (!subscription) return null;
    
    const product = stripeProducts.find(p => p.priceId === subscription.price_id);
    return product;
  };

  const getRiskColor = (type: 'high' | 'medium' | 'low') => {
    switch (type) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskIcon = (type: 'high' | 'medium' | 'low') => {
    switch (type) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const LandingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ContractGuard</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('pricing')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pricing
              </button>
              {user ? (
                <div className="flex items-center space-x-4">
                  {getActiveSubscription() && (
                    <span className="text-sm text-gray-600">
                      {getActiveSubscription()?.name}
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentView('upload')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Analyze Contract
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setAuthModal({ isOpen: true, mode: 'signin' })}
                    className="text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-1"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your <span className="text-blue-600">Mini Legal Co-Pilot</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload your contracts and get instant risk analysis with plain-English explanations. 
            Protect your business with AI-powered contract review.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleFreeAccess}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>{user ? 'Analyze Your Contract' : 'Analyze Your First Contract Free'}</span>
            </button>
            <button
              onClick={() => setCurrentView('pricing')}
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Pricing
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Quick Analysis</h3>
            <p className="text-gray-600">Upload PDF or DOCX files and get comprehensive risk analysis in under 60 seconds.</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Risk Detection</h3>
            <p className="text-gray-600">Identify problematic clauses including payment terms, IP rights, and non-compete agreements.</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Export & Revise</h3>
            <p className="text-gray-600">Get suggested revisions and export clean versions of your contracts.</p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-20 text-center">
          <p className="text-gray-600 mb-8">Trusted by freelancers and small businesses worldwide</p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>500+ Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>1,000+ Contracts Analyzed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const UploadPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentView('landing')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ContractGuard</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Upload Your Contract</h1>
          <p className="text-xl text-gray-600">Get instant risk analysis and protection recommendations</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your contract here</h3>
            <p className="text-gray-600 mb-4">or click to browse files</p>
            <p className="text-sm text-gray-500">Supports DOCX and TXT files up to 10MB</p>
            <input
              id="fileInput"
              type="file"
              accept=".docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </div>

          <div className="mt-8 flex justify-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Your documents are secure and private</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">Files are encrypted and automatically deleted after analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const AnalysisPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentView('landing')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ContractGuard</span>
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('compare')}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                disabled={isAnalyzing}
              >
                Side-by-Side View
              </button>
              <button
                onClick={handleExportReport}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                disabled={isAnalyzing}
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAnalyzing ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Analyzing Your Contract</h2>
            <p className="text-gray-600">Our AI is extracting text and analyzing your document for potential risks...</p>
            <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds depending on document size</p>
          </div>
        ) : analysisError ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Analysis Error</h2>
            <p className="text-gray-600 mb-4">{analysisError}</p>
            <button
              onClick={() => setCurrentView('upload')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Another File
            </button>
          </div>
        ) : analysisResult ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overall Score</p>
                    <p className="text-3xl font-bold text-blue-600">{analysisResult.overallScore}/100</p>
                  </div>
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Risk Issues</p>
                    <p className="text-3xl font-bold text-red-600">{analysisResult.risks.filter(r => r.type === 'high').length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Medium Risk Issues</p>
                    <p className="text-3xl font-bold text-yellow-600">{analysisResult.risks.filter(r => r.type === 'medium').length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Clauses</p>
                    <p className="text-3xl font-bold text-gray-900">{analysisResult.totalClauses}</p>
                  </div>
                  <FileText className="w-8 h-8 text-gray-600" />
                </div>
              </div>
            </div>

            {/* Risk Items */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Identified Risks</h2>
              <div className="space-y-6">
                {analysisResult.risks.map((risk) => (
                  <div key={risk.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getRiskIcon(risk.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(risk.type)}`}>
                            {risk.type.toUpperCase()} RISK
                          </span>
                          <span className="text-sm text-gray-500">{risk.location}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{risk.category}: {risk.description}</h3>
                        <p className="text-gray-600 mb-3">{risk.explanation}</p>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-1">Suggested Revision:</p>
                          <p className="text-sm text-blue-700">{risk.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const ComparePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentView('landing')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ContractGuard</span>
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('analysis')}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Risk Analysis
              </button>
              <button 
                onClick={handleExportRevised}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                disabled={!analysisResult}
              >
                <Download className="w-4 h-4" />
                <span>Export Revised</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Side-by-Side Comparison</h1>
          <p className="text-gray-600">Original contract vs. AI-suggested improvements</p>
        </div>

        {analysisResult && analysisResult.revisedSections.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Original Contract */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-600" />
                Original Contract
              </h2>
              <div className="space-y-4 text-sm">
                {analysisResult.revisedSections.map((section, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 mb-2">{section.section}</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{section.original}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Revised Contract */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Suggested Revisions
              </h2>
              <div className="space-y-4 text-sm">
                {analysisResult.revisedSections.map((section, index) => (
                  <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-gray-900 mb-2">{section.section}</p>
                    <div 
                      className="text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: section.revised.replace(
                          /\*\*(.*?)\*\*/g, 
                          '<span class="bg-green-200 font-medium">$1</span>'
                        )
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Comparison Available</h2>
            <p className="text-gray-600 mb-4">
              {analysisResult ? 
                'The AI analysis didn\'t generate specific section revisions for this contract.' : 
                'Please analyze a contract first to see the side-by-side comparison.'
              }
            </p>
            <button
              onClick={() => setCurrentView('analysis')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const PricingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentView('landing')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ContractGuard</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that fits your needs</p>
          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-600" />
              <span>Secure payments powered by Stripe</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Trial</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">Free</div>
              <p className="text-gray-600 mb-4">Perfect for trying out our service</p>
              
              <ul className="space-y-2 mb-6 text-left max-w-sm mx-auto">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">1 free contract analysis</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Risk identification</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Basic recommendations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Export functionality</span>
                </li>
              </ul>
              
              <button
                onClick={handleFreeAccess}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {user ? 'Start Analyzing' : 'Get Started Free'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {stripeProducts.map((product) => (
            <div 
              key={product.id}
              className={`bg-white rounded-xl shadow-lg p-8 relative transition-all duration-200 hover:shadow-xl ${
                product.popular ? 'border-2 border-blue-600 scale-105' : 'border border-gray-200'
              }`}
            >
              {product.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Most Popular</span>
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {formatPrice(product.price, product.mode, product.interval)}
                </div>
                <p className="text-gray-600">
                  {product.mode === 'subscription' ? `Billed ${product.interval}ly` : 'One-time payment'}
                </p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleProductSelection(product.id)}
                disabled={isProcessingPayment && selectedProduct === product.id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  product.popular 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } ${isProcessingPayment && selectedProduct === product.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessingPayment && selectedProduct === product.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {!user ? 'Sign In to Purchase' :
                     product.mode === 'subscription' ? 'Start Subscription' : 'Buy Now'}
                  </span>
                )}
              </button>
              
              {product.price > 0 && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  Secure payment powered by Stripe
                </p>
              )}
            </div>
          ))}
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-20 bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Why Choose ContractGuard?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
              <p className="text-sm text-gray-600">Your contracts are encrypted and automatically deleted after analysis</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-sm text-gray-600">Advanced AI identifies risks human reviewers might miss</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Professional Reports</h3>
              <p className="text-sm text-gray-600">Export detailed analysis reports for your records</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Results</h3>
              <p className="text-sm text-gray-600">Get comprehensive analysis in under 60 seconds</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">Is my contract data secure?</h3>
              <p className="text-gray-600">Yes, all contracts are encrypted during upload and analysis, then automatically deleted from our servers after processing.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">What file formats do you support?</h3>
              <p className="text-gray-600">We currently support DOCX and TXT files. PDF support is coming soon.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-gray-600">Yes, you can cancel your Pro Monthly subscription at any time. No long-term commitments required.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">Do you provide legal advice?</h3>
              <p className="text-gray-600">No, ContractGuard provides AI-powered analysis and suggestions. Always consult with a qualified attorney for legal advice.</p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Need help choosing the right plan?</p>
          <button className="text-blue-600 hover:text-blue-800 transition-colors font-medium flex items-center justify-center mx-auto">
            Contact our team <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );

  const SuccessPageComponent = () => (
    <SuccessPage onContinue={() => setCurrentView('upload')} />
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing': return <LandingPage />;
      case 'upload': return <UploadPage />;
      case 'analysis': return <AnalysisPage />;
      case 'compare': return <ComparePage />;
      case 'pricing': return <PricingPage />;
      case 'success': return <SuccessPageComponent />;
      default: return <LandingPage />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {renderCurrentView()}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        mode={authModal.mode}
        onModeChange={(mode) => setAuthModal({ ...authModal, mode })}
      />
    </>
  );
}

export default App;
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');

dotenv.config();

const templates = [
  {
    name: 'Customer Satisfaction Survey',
    name_ar: 'استبيان رضا العملاء',
    description: 'Measure customer satisfaction and gather feedback on your products or services',
    description_ar: 'قياس رضا العملاء وجمع التعليقات حول منتجاتك أو خدماتك',
    category: 'Customer Feedback',
    industry: 'General',
    tags: ['customer', 'satisfaction', 'feedback'],
    template: {
      title: 'Customer Satisfaction Survey',
      title_ar: 'استبيان رضا العملاء',
      description: 'Help us improve by sharing your experience',
      description_ar: 'ساعدنا على التحسين من خلال مشاركة تجربتك',
      questions: [
        {
          type: 'rating',
          question: 'How satisfied are you with our product/service?',
          question_ar: 'ما مدى رضاك عن منتجنا/خدمتنا؟',
          required: true,
          validation: { min: 1, max: 5 },
          order: 1
        },
        {
          type: 'multiple_choice',
          question: 'How likely are you to recommend us to a friend?',
          question_ar: 'ما مدى احتمالية توصيتك لنا لصديق؟',
          required: true,
          options: ['Very likely', 'Likely', 'Neutral', 'Unlikely', 'Very unlikely'],
          options_ar: ['محتمل جداً', 'محتمل', 'محايد', 'غير محتمل', 'غير محتمل جداً'],
          order: 2
        },
        {
          type: 'textarea',
          question: 'What can we do to improve?',
          question_ar: 'ما الذي يمكننا فعله للتحسين؟',
          required: false,
          validation: { maxLength: 500 },
          order: 3
        }
      ],
      settings: {
        allowAnonymous: true,
        showProgressBar: true,
        thankYouMessage: 'Thank you for your feedback!',
        thankYouMessage_ar: 'شكراً لملاحظاتك!'
      }
    }
  },
  {
    name: 'Employee Engagement Survey',
    name_ar: 'استبيان مشاركة الموظفين',
    description: 'Assess employee satisfaction, engagement, and workplace culture',
    description_ar: 'تقييم رضا الموظفين ومشاركتهم وثقافة مكان العمل',
    category: 'HR & Employee',
    industry: 'Human Resources',
    tags: ['employee', 'engagement', 'hr', 'workplace'],
    template: {
      title: 'Employee Engagement Survey',
      title_ar: 'استبيان مشاركة الموظفين',
      description: 'Share your thoughts on your workplace experience',
      description_ar: 'شارك أفكارك حول تجربتك في مكان العمل',
      questions: [
        {
          type: 'rating',
          question: 'How satisfied are you with your current role?',
          question_ar: 'ما مدى رضاك عن دورك الحالي؟',
          required: true,
          validation: { min: 1, max: 5 },
          order: 1
        },
        {
          type: 'rating',
          question: 'How would you rate work-life balance?',
          question_ar: 'كيف تقيم التوازن بين العمل والحياة؟',
          required: true,
          validation: { min: 1, max: 5 },
          order: 2
        },
        {
          type: 'multiple_choice',
          question: 'Do you feel valued at work?',
          question_ar: 'هل تشعر بالتقدير في العمل؟',
          required: true,
          options: ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'],
          options_ar: ['دائماً', 'غالباً', 'أحياناً', 'نادراً', 'أبداً'],
          order: 3
        },
        {
          type: 'textarea',
          question: 'What would make your work experience better?',
          question_ar: 'ما الذي قد يجعل تجربة عملك أفضل؟',
          required: false,
          validation: { maxLength: 500 },
          order: 4
        }
      ],
      settings: {
        allowAnonymous: true,
        showProgressBar: true,
        thankYouMessage: 'Thank you for your valuable input!',
        thankYouMessage_ar: 'شكراً لمساهمتك القيمة!'
      }
    }
  },
  {
    name: 'Event Feedback Survey',
    name_ar: 'استبيان تعليقات الحدث',
    description: 'Collect feedback from event attendees',
    description_ar: 'جمع التعليقات من الحضور في الحدث',
    category: 'Events',
    industry: 'Event Management',
    tags: ['event', 'feedback', 'attendee'],
    template: {
      title: 'Event Feedback Survey',
      title_ar: 'استبيان تعليقات الحدث',
      description: 'Help us improve future events',
      description_ar: 'ساعدنا على تحسين الفعاليات المستقبلية',
      questions: [
        {
          type: 'rating',
          question: 'Overall, how would you rate the event?',
          question_ar: 'بشكل عام، كيف تقيم الحدث؟',
          required: true,
          validation: { min: 1, max: 5 },
          order: 1
        },
        {
          type: 'checkbox',
          question: 'Which aspects did you enjoy most?',
          question_ar: 'ما هي الجوانب التي استمتعت بها أكثر؟',
          required: false,
          options: ['Speakers', 'Content', 'Venue', 'Networking', 'Food & Beverages'],
          options_ar: ['المتحدثون', 'المحتوى', 'المكان', 'التواصل', 'الطعام والمشروبات'],
          order: 2
        },
        {
          type: 'multiple_choice',
          question: 'Would you attend future events?',
          question_ar: 'هل ستحضر الفعاليات المستقبلية؟',
          required: true,
          options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'],
          options_ar: ['بالتأكيد', 'ربما', 'ربما', 'ربما لا', 'بالتأكيد لا'],
          order: 3
        },
        {
          type: 'textarea',
          question: 'Any additional comments or suggestions?',
          question_ar: 'أي تعليقات أو اقتراحات إضافية؟',
          required: false,
          validation: { maxLength: 500 },
          order: 4
        }
      ],
      settings: {
        allowAnonymous: true,
        showProgressBar: true,
        thankYouMessage: 'Thank you for attending!',
        thankYouMessage_ar: 'شكراً لحضورك!'
      }
    }
  },
  {
    name: 'Product Feedback Survey',
    name_ar: 'استبيان تعليقات المنتج',
    description: 'Gather insights about product features and user experience',
    description_ar: 'جمع رؤى حول ميزات المنتج وتجربة المستخدم',
    category: 'Product Research',
    industry: 'Technology',
    tags: ['product', 'ux', 'features', 'feedback'],
    template: {
      title: 'Product Feedback Survey',
      title_ar: 'استبيان تعليقات المنتج',
      description: 'Share your experience with our product',
      description_ar: 'شارك تجربتك مع منتجنا',
      questions: [
        {
          type: 'multiple_choice',
          question: 'How often do you use our product?',
          question_ar: 'كم مرة تستخدم منتجنا؟',
          required: true,
          options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
          options_ar: ['يومياً', 'أسبوعياً', 'شهرياً', 'نادراً'],
          order: 1
        },
        {
          type: 'rating',
          question: 'How easy is our product to use?',
          question_ar: 'ما مدى سهولة استخدام منتجنا؟',
          required: true,
          validation: { min: 1, max: 5 },
          order: 2
        },
        {
          type: 'checkbox',
          question: 'Which features do you use most?',
          question_ar: 'ما هي الميزات التي تستخدمها أكثر؟',
          required: false,
          options: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
          options_ar: ['ميزة أ', 'ميزة ب', 'ميزة ج', 'ميزة د'],
          order: 3
        },
        {
          type: 'textarea',
          question: 'What feature would you like us to add?',
          question_ar: 'ما هي الميزة التي تريدنا أن نضيفها؟',
          required: false,
          validation: { maxLength: 500 },
          order: 4
        }
      ],
      settings: {
        allowAnonymous: false,
        showProgressBar: true,
        thankYouMessage: 'Thank you for helping us improve!',
        thankYouMessage_ar: 'شكراً لمساعدتنا على التحسين!'
      }
    }
  },
  {
    name: 'Market Research Survey',
    name_ar: 'استبيان أبحاث السوق',
    description: 'Conduct market research and gather consumer insights',
    description_ar: 'إجراء أبحاث السوق وجمع رؤى المستهلكين',
    category: 'Market Research',
    industry: 'General',
    tags: ['market', 'research', 'consumer', 'insights'],
    template: {
      title: 'Market Research Survey',
      title_ar: 'استبيان أبحاث السوق',
      description: 'Help us understand market trends',
      description_ar: 'ساعدنا على فهم اتجاهات السوق',
      questions: [
        {
          type: 'dropdown',
          question: 'What is your age range?',
          question_ar: 'ما هي فئتك العمرية؟',
          required: true,
          options: ['18-25', '26-35', '36-45', '46-55', '56+'],
          options_ar: ['18-25', '26-35', '36-45', '46-55', '56+'],
          order: 1
        },
        {
          type: 'dropdown',
          question: 'What is your income range?',
          question_ar: 'ما هو نطاق دخلك؟',
          required: false,
          options: ['< $30k', '$30k-$50k', '$50k-$75k', '$75k-$100k', '> $100k'],
          options_ar: ['< 30 ألف', '30-50 ألف', '50-75 ألف', '75-100 ألف', '> 100 ألف'],
          order: 2
        },
        {
          type: 'multiple_choice',
          question: 'How do you prefer to shop?',
          question_ar: 'كيف تفضل التسوق؟',
          required: true,
          options: ['Online', 'In-store', 'Both equally'],
          options_ar: ['عبر الإنترنت', 'في المتجر', 'كلاهما بالتساوي'],
          order: 3
        },
        {
          type: 'textarea',
          question: 'What factors influence your purchasing decisions?',
          question_ar: 'ما هي العوامل التي تؤثر على قرارات الشراء الخاصة بك؟',
          required: false,
          validation: { maxLength: 500 },
          order: 4
        }
      ],
      settings: {
        allowAnonymous: true,
        showProgressBar: true,
        thankYouMessage: 'Thank you for participating!',
        thankYouMessage_ar: 'شكراً على مشاركتك!'
      }
    }
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing templates
    await Template.deleteMany({});
    console.log('Cleared existing templates');

    // Insert new templates
    await Template.insertMany(templates);
    console.log(`Inserted ${templates.length} templates`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

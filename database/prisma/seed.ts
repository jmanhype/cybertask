import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default roles
  console.log('📋 Creating roles...')
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'System administrator with full access',
      permissions: ['all'],
    },
  })

  const orgOwnerRole = await prisma.role.upsert({
    where: { name: 'org_owner' },
    update: {},
    create: {
      name: 'org_owner',
      description: 'Organization owner with full org access',
      permissions: ['org.manage', 'projects.manage', 'teams.manage', 'users.manage'],
    },
  })

  const orgAdminRole = await prisma.role.upsert({
    where: { name: 'org_admin' },
    update: {},
    create: {
      name: 'org_admin',
      description: 'Organization administrator',
      permissions: ['projects.manage', 'teams.manage', 'users.view'],
    },
  })

  const projectManagerRole = await prisma.role.upsert({
    where: { name: 'project_manager' },
    update: {},
    create: {
      name: 'project_manager',
      description: 'Project manager',
      permissions: ['projects.manage', 'tasks.manage', 'teams.view'],
    },
  })

  const developerRole = await prisma.role.upsert({
    where: { name: 'developer' },
    update: {},
    create: {
      name: 'developer',
      description: 'Developer with task management access',
      permissions: ['tasks.manage', 'projects.view', 'time.track'],
    },
  })

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      description: 'Read-only access',
      permissions: ['projects.view', 'tasks.view'],
    },
  })

  // Create sample users
  console.log('👥 Creating users...')
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cybertask.ai' },
    update: {},
    create: {
      email: 'admin@cybertask.ai',
      username: 'admin',
      passwordHash: await hash('admin123', 12),
      firstName: 'System',
      lastName: 'Administrator',
      emailVerified: true,
      timezone: 'UTC',
      theme: 'dark',
    },
  })

  const johnUser = await prisma.user.upsert({
    where: { email: 'john.doe@cybertask.ai' },
    update: {},
    create: {
      email: 'john.doe@cybertask.ai',
      username: 'johndoe',
      passwordHash: await hash('password123', 12),
      firstName: 'John',
      lastName: 'Doe',
      emailVerified: true,
      timezone: 'America/New_York',
      theme: 'light',
    },
  })

  const janeUser = await prisma.user.upsert({
    where: { email: 'jane.smith@cybertask.ai' },
    update: {},
    create: {
      email: 'jane.smith@cybertask.ai',
      username: 'janesmith',
      passwordHash: await hash('password123', 12),
      firstName: 'Jane',
      lastName: 'Smith',
      emailVerified: true,
      timezone: 'Europe/London',
      theme: 'light',
    },
  })

  const aliceUser = await prisma.user.upsert({
    where: { email: 'alice.johnson@cybertask.ai' },
    update: {},
    create: {
      email: 'alice.johnson@cybertask.ai',
      username: 'alicejohnson',
      passwordHash: await hash('password123', 12),
      firstName: 'Alice',
      lastName: 'Johnson',
      emailVerified: true,
      timezone: 'America/Los_Angeles',
      theme: 'dark',
    },
  })

  const bobUser = await prisma.user.upsert({
    where: { email: 'bob.wilson@cybertask.ai' },
    update: {},
    create: {
      email: 'bob.wilson@cybertask.ai',
      username: 'bobwilson',
      passwordHash: await hash('password123', 12),
      firstName: 'Bob',
      lastName: 'Wilson',
      emailVerified: true,
      timezone: 'Australia/Sydney',
      theme: 'light',
    },
  })

  // Assign roles to users
  console.log('🔑 Assigning user roles...')
  await prisma.userRole.createMany({
    data: [
      { userId: adminUser.id, roleId: adminRole.id },
      { userId: johnUser.id, roleId: orgOwnerRole.id },
      { userId: janeUser.id, roleId: projectManagerRole.id },
      { userId: aliceUser.id, roleId: developerRole.id },
      { userId: bobUser.id, roleId: developerRole.id },
    ],
    skipDuplicates: true,
  })

  // Create organizations
  console.log('🏢 Creating organizations...')
  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      description: 'Leading technology solutions provider',
      websiteUrl: 'https://acme-corp.com',
      subscriptionTier: 'pro',
      createdBy: johnUser.id,
      settings: {
        allowPublicProjects: false,
        defaultTaskPriority: 'medium',
        workingHours: { start: '09:00', end: '17:00' },
      },
    },
  })

  const startupOrg = await prisma.organization.upsert({
    where: { slug: 'innovative-startup' },
    update: {},
    create: {
      name: 'Innovative Startup',
      slug: 'innovative-startup',
      description: 'Disrupting the future with AI-powered solutions',
      subscriptionTier: 'free',
      createdBy: aliceUser.id,
      settings: {
        allowPublicProjects: true,
        defaultTaskPriority: 'high',
        workingHours: { start: '10:00', end: '18:00' },
      },
    },
  })

  // Add organization members
  console.log('👨‍💼 Adding organization members...')
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: acmeOrg.id, userId: johnUser.id, role: 'owner' },
      { organizationId: acmeOrg.id, userId: janeUser.id, role: 'admin' },
      { organizationId: acmeOrg.id, userId: aliceUser.id, role: 'member' },
      { organizationId: acmeOrg.id, userId: bobUser.id, role: 'member' },
      { organizationId: startupOrg.id, userId: aliceUser.id, role: 'owner' },
      { organizationId: startupOrg.id, userId: bobUser.id, role: 'member' },
    ],
    skipDuplicates: true,
  })

  // Create teams
  console.log('👥 Creating teams...')
  const frontendTeam = await prisma.team.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Frontend Development',
      description: 'Responsible for user interface and experience',
      color: '#3B82F6',
      createdBy: janeUser.id,
    },
  })

  const backendTeam = await prisma.team.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Backend Development',
      description: 'API and server-side development',
      color: '#10B981',
      createdBy: janeUser.id,
    },
  })

  const aiTeam = await prisma.team.create({
    data: {
      organizationId: startupOrg.id,
      name: 'AI Research',
      description: 'Machine learning and AI development',
      color: '#8B5CF6',
      createdBy: aliceUser.id,
    },
  })

  // Add team members
  console.log('🤝 Adding team members...')
  await prisma.teamMember.createMany({
    data: [
      { teamId: frontendTeam.id, userId: aliceUser.id, role: 'lead' },
      { teamId: backendTeam.id, userId: bobUser.id, role: 'lead' },
      { teamId: backendTeam.id, userId: johnUser.id, role: 'member' },
      { teamId: aiTeam.id, userId: aliceUser.id, role: 'lead' },
      { teamId: aiTeam.id, userId: bobUser.id, role: 'member' },
    ],
    skipDuplicates: true,
  })

  // Create projects
  console.log('📋 Creating projects...')
  const webAppProject = await prisma.project.create({
    data: {
      organizationId: acmeOrg.id,
      teamId: frontendTeam.id,
      name: 'Customer Portal Web Application',
      description: 'Modern web application for customer self-service portal with real-time analytics',
      color: '#3B82F6',
      status: 'active',
      priority: 'high',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-30'),
      estimatedHours: 2000,
      createdBy: janeUser.id,
      settings: {
        enableTimeTracking: true,
        autoAssignTasks: false,
        notifications: {
          email: true,
          slack: true,
        },
      },
    },
  })

  const mobileAppProject = await prisma.project.create({
    data: {
      organizationId: acmeOrg.id,
      teamId: frontendTeam.id,
      name: 'Mobile Application',
      description: 'Cross-platform mobile app for iOS and Android',
      color: '#F59E0B',
      status: 'active',
      priority: 'medium',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-08-31'),
      estimatedHours: 1500,
      createdBy: janeUser.id,
    },
  })

  const aiPlatformProject = await prisma.project.create({
    data: {
      organizationId: startupOrg.id,
      teamId: aiTeam.id,
      name: 'AI Analytics Platform',
      description: 'Machine learning platform for predictive analytics and automated insights',
      color: '#8B5CF6',
      status: 'active',
      priority: 'critical',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-12-31'),
      estimatedHours: 5000,
      createdBy: aliceUser.id,
    },
  })

  const legacyProject = await prisma.project.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Legacy System Migration',
      description: 'Migrate old monolithic system to microservices architecture',
      color: '#EF4444',
      status: 'completed',
      priority: 'high',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-12-31'),
      estimatedHours: 3000,
      actualHours: 3200,
      createdBy: johnUser.id,
    },
  })

  // Create tasks for web app project
  console.log('📝 Creating tasks...')
  const setupTask = await prisma.task.create({
    data: {
      projectId: webAppProject.id,
      title: 'Setup Development Environment',
      description: 'Configure development environment with Docker, database, and CI/CD pipeline',
      status: 'done',
      priority: 'high',
      assignedTo: bobUser.id,
      createdBy: janeUser.id,
      estimatedHours: 16,
      actualHours: 14,
      completedAt: new Date('2025-01-05'),
      labels: ['setup', 'infrastructure'],
      category: 'setup',
      aiPriorityScore: 0.95,
      aiComplexityScore: 0.7,
    },
  })

  const authTask = await prisma.task.create({
    data: {
      projectId: webAppProject.id,
      title: 'Implement User Authentication',
      description: 'Build secure authentication system with JWT, OAuth, and two-factor authentication',
      status: 'in_progress',
      priority: 'critical',
      assignedTo: bobUser.id,
      createdBy: janeUser.id,
      estimatedHours: 40,
      actualHours: 28,
      dueDate: new Date('2025-02-15'),
      labels: ['auth', 'security', 'backend'],
      category: 'backend',
      aiPriorityScore: 0.98,
      aiComplexityScore: 0.85,
      aiInsights: {
        suggestedLibraries: ['passport.js', 'auth0'],
        securityConsiderations: ['rate limiting', 'password policies'],
        testingStrategy: 'unit and integration tests required',
      },
    },
  })

  const dashboardTask = await prisma.task.create({
    data: {
      projectId: webAppProject.id,
      title: 'Create Customer Dashboard',
      description: 'Interactive dashboard with charts, metrics, and real-time data visualization',
      status: 'todo',
      priority: 'high',
      assignedTo: aliceUser.id,
      createdBy: janeUser.id,
      estimatedHours: 60,
      dueDate: new Date('2025-03-01'),
      labels: ['frontend', 'ui', 'dashboard'],
      category: 'frontend',
      aiPriorityScore: 0.82,
      aiComplexityScore: 0.75,
    },
  })

  const apiTask = await prisma.task.create({
    data: {
      projectId: webAppProject.id,
      title: 'Build REST API Endpoints',
      description: 'Comprehensive REST API with CRUD operations, pagination, filtering, and documentation',
      status: 'review',
      priority: 'high',
      assignedTo: bobUser.id,
      createdBy: janeUser.id,
      estimatedHours: 80,
      actualHours: 72,
      labels: ['api', 'backend', 'documentation'],
      category: 'backend',
      aiPriorityScore: 0.88,
      aiComplexityScore: 0.68,
    },
  })

  const testingTask = await prisma.task.create({
    data: {
      projectId: webAppProject.id,
      parentTaskId: apiTask.id,
      title: 'API Integration Tests',
      description: 'Comprehensive test suite for API endpoints with edge cases and error handling',
      status: 'todo',
      priority: 'medium',
      assignedTo: aliceUser.id,
      createdBy: janeUser.id,
      estimatedHours: 24,
      dueDate: new Date('2025-02-20'),
      labels: ['testing', 'api', 'quality'],
      category: 'testing',
      aiPriorityScore: 0.65,
      aiComplexityScore: 0.55,
    },
  })

  // Create tasks for AI platform project
  const mlModelTask = await prisma.task.create({
    data: {
      projectId: aiPlatformProject.id,
      title: 'Develop Predictive ML Models',
      description: 'Create machine learning models for customer behavior prediction and churn analysis',
      status: 'in_progress',
      priority: 'critical',
      assignedTo: aliceUser.id,
      createdBy: aliceUser.id,
      estimatedHours: 120,
      actualHours: 95,
      dueDate: new Date('2025-04-30'),
      labels: ['ml', 'python', 'tensorflow'],
      category: 'ai',
      difficultyScore: 9,
      storyPoints: 13,
      aiPriorityScore: 0.95,
      aiComplexityScore: 0.92,
    },
  })

  const dataProcessingTask = await prisma.task.create({
    data: {
      projectId: aiPlatformProject.id,
      title: 'Data Pipeline Infrastructure',
      description: 'Build scalable data processing pipeline with Apache Kafka and Spark',
      status: 'todo',
      priority: 'high',
      assignedTo: bobUser.id,
      createdBy: aliceUser.id,
      estimatedHours: 80,
      dueDate: new Date('2025-03-15'),
      labels: ['infrastructure', 'data', 'kafka', 'spark'],
      category: 'infrastructure',
      difficultyScore: 8,
      storyPoints: 8,
      aiPriorityScore: 0.78,
      aiComplexityScore: 0.84,
    },
  })

  // Create some blocked tasks
  const deploymentTask = await prisma.task.create({
    data: {
      projectId: webAppProject.id,
      title: 'Production Deployment Setup',
      description: 'Configure production environment with load balancing and monitoring',
      status: 'blocked',
      priority: 'medium',
      createdBy: janeUser.id,
      estimatedHours: 32,
      labels: ['deployment', 'devops', 'monitoring'],
      category: 'devops',
      aiPriorityScore: 0.58,
      aiComplexityScore: 0.71,
    },
  })

  // Create task dependencies
  console.log('🔗 Creating task dependencies...')
  await prisma.taskDependency.createMany({
    data: [
      {
        taskId: authTask.id,
        dependsOnTaskId: setupTask.id,
        dependencyType: 'blocks',
      },
      {
        taskId: dashboardTask.id,
        dependsOnTaskId: apiTask.id,
        dependencyType: 'blocks',
      },
      {
        taskId: testingTask.id,
        dependsOnTaskId: apiTask.id,
        dependencyType: 'blocks',
      },
      {
        taskId: deploymentTask.id,
        dependsOnTaskId: authTask.id,
        dependencyType: 'blocks',
      },
      {
        taskId: dataProcessingTask.id,
        dependsOnTaskId: mlModelTask.id,
        dependencyType: 'relates_to',
      },
    ],
    skipDuplicates: true,
  })

  // Create task comments
  console.log('💬 Creating task comments...')
  await prisma.taskComment.createMany({
    data: [
      {
        taskId: authTask.id,
        userId: bobUser.id,
        content: 'Started implementing OAuth integration. Need to review security best practices.',
        type: 'comment',
      },
      {
        taskId: authTask.id,
        userId: janeUser.id,
        content: 'Please ensure we implement proper rate limiting and password policies.',
        type: 'comment',
      },
      {
        taskId: dashboardTask.id,
        userId: aliceUser.id,
        content: 'Working on the wireframes. Should we include real-time notifications?',
        type: 'comment',
      },
      {
        taskId: mlModelTask.id,
        userId: aliceUser.id,
        content: 'Initial model training complete. Achieving 87% accuracy on validation set.',
        type: 'comment',
      },
      {
        taskId: setupTask.id,
        userId: bobUser.id,
        content: 'Development environment is ready. Docker setup working perfectly.',
        type: 'status_change',
        metadata: {
          previousStatus: 'in_progress',
          newStatus: 'done',
        },
      },
    ],
  })

  // Create time entries
  console.log('⏰ Creating time entries...')
  await prisma.timeEntry.createMany({
    data: [
      {
        taskId: setupTask.id,
        userId: bobUser.id,
        description: 'Docker configuration and database setup',
        hours: 8,
        date: new Date('2025-01-02'),
        billable: true,
      },
      {
        taskId: setupTask.id,
        userId: bobUser.id,
        description: 'CI/CD pipeline configuration',
        hours: 6,
        date: new Date('2025-01-03'),
        billable: true,
      },
      {
        taskId: authTask.id,
        userId: bobUser.id,
        description: 'JWT implementation and testing',
        hours: 8,
        date: new Date('2025-01-08'),
        billable: true,
      },
      {
        taskId: authTask.id,
        userId: bobUser.id,
        description: 'OAuth provider integration',
        hours: 6,
        date: new Date('2025-01-09'),
        billable: true,
      },
      {
        taskId: authTask.id,
        userId: bobUser.id,
        description: 'Two-factor authentication implementation',
        hours: 7.5,
        date: new Date('2025-01-10'),
        billable: true,
      },
      {
        taskId: mlModelTask.id,
        userId: aliceUser.id,
        description: 'Data preprocessing and feature engineering',
        hours: 8,
        date: new Date('2025-01-20'),
        billable: true,
      },
      {
        taskId: mlModelTask.id,
        userId: aliceUser.id,
        description: 'Model training and hyperparameter tuning',
        hours: 12,
        date: new Date('2025-01-21'),
        billable: false,
      },
    ],
  })

  // Create notifications
  console.log('🔔 Creating notifications...')
  await prisma.notification.createMany({
    data: [
      {
        userId: aliceUser.id,
        type: 'task_assigned',
        title: 'New task assigned: Create Customer Dashboard',
        content: 'You have been assigned to work on the customer dashboard for the web application project.',
        data: {
          taskId: dashboardTask.id,
          projectId: webAppProject.id,
          assignedBy: janeUser.id,
        },
      },
      {
        userId: bobUser.id,
        type: 'task_updated',
        title: 'Task status updated: Build REST API Endpoints',
        content: 'Task status changed from "in_progress" to "review"',
        data: {
          taskId: apiTask.id,
          previousStatus: 'in_progress',
          newStatus: 'review',
        },
        read: true,
        readAt: new Date(),
      },
      {
        userId: janeUser.id,
        type: 'deadline_approaching',
        title: 'Deadline approaching: Implement User Authentication',
        content: 'Task deadline is in 3 days',
        data: {
          taskId: authTask.id,
          daysRemaining: 3,
        },
      },
      {
        userId: aliceUser.id,
        type: 'comment_added',
        title: 'New comment on: Create Customer Dashboard',
        content: 'Jane Smith added a comment to your task',
        data: {
          taskId: dashboardTask.id,
          commentId: 'comment-uuid',
          commentBy: janeUser.id,
        },
      },
    ],
  })

  // Create activity logs
  console.log('📊 Creating activity logs...')
  await prisma.activityLog.createMany({
    data: [
      {
        userId: janeUser.id,
        organizationId: acmeOrg.id,
        entityType: 'project',
        entityId: webAppProject.id,
        action: 'created',
        details: {
          projectName: 'Customer Portal Web Application',
        },
      },
      {
        userId: bobUser.id,
        organizationId: acmeOrg.id,
        entityType: 'task',
        entityId: setupTask.id,
        action: 'completed',
        details: {
          taskTitle: 'Setup Development Environment',
          hoursLogged: 14,
        },
      },
      {
        userId: aliceUser.id,
        organizationId: startupOrg.id,
        entityType: 'task',
        entityId: mlModelTask.id,
        action: 'updated',
        details: {
          taskTitle: 'Develop Predictive ML Models',
          changes: ['status', 'actual_hours'],
        },
      },
      {
        userId: janeUser.id,
        organizationId: acmeOrg.id,
        entityType: 'task',
        entityId: dashboardTask.id,
        action: 'assigned',
        details: {
          taskTitle: 'Create Customer Dashboard',
          assignedTo: aliceUser.id,
        },
      },
    ],
  })

  // Create AI analyses
  console.log('🤖 Creating AI analyses...')
  await prisma.aiAnalysis.createMany({
    data: [
      {
        entityType: 'task',
        entityId: authTask.id,
        analysisType: 'priority',
        inputData: {
          title: 'Implement User Authentication',
          labels: ['auth', 'security', 'backend'],
          dueDate: '2025-02-15',
          dependencies: ['setup'],
        },
        outputData: {
          priorityScore: 0.98,
          reasoning: 'Critical security component blocking other features',
          recommendations: ['Focus on security best practices', 'Implement comprehensive testing'],
        },
        confidenceScore: 0.95,
        modelVersion: 'claude-3.5-sonnet',
        processingTimeMs: 1250,
      },
      {
        entityType: 'task',
        entityId: mlModelTask.id,
        analysisType: 'complexity',
        inputData: {
          title: 'Develop Predictive ML Models',
          description: 'Create machine learning models for customer behavior prediction',
          difficultyScore: 9,
          storyPoints: 13,
        },
        outputData: {
          complexityScore: 0.92,
          estimatedHours: 120,
          riskFactors: ['Data quality', 'Model interpretability', 'Deployment complexity'],
          suggestedApproach: 'Iterative development with frequent validation',
        },
        confidenceScore: 0.88,
        modelVersion: 'claude-3.5-sonnet',
        processingTimeMs: 2100,
      },
      {
        entityType: 'project',
        entityId: webAppProject.id,
        analysisType: 'optimization',
        inputData: {
          projectName: 'Customer Portal Web Application',
          totalTasks: 5,
          completedTasks: 1,
          teamSize: 3,
        },
        outputData: {
          optimizationSuggestions: [
            'Parallelize frontend and backend development',
            'Implement automated testing early',
            'Consider API-first approach',
          ],
          riskAssessment: 'Medium risk due to tight timeline',
          recommendedActions: ['Daily standups', 'Code reviews', 'Continuous integration'],
        },
        confidenceScore: 0.82,
        modelVersion: 'claude-3.5-sonnet',
        processingTimeMs: 1800,
      },
    ],
  })

  // Create Claude workflows
  console.log('🔄 Creating Claude workflows...')
  await prisma.claudeWorkflow.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Automated Task Prioritization',
      description: 'Automatically prioritize tasks based on dependencies, deadlines, and business impact',
      workflowConfig: {
        triggers: ['task.created', 'task.updated'],
        actions: [
          {
            type: 'analyze_priority',
            model: 'claude-3.5-sonnet',
            parameters: {
              considerDependencies: true,
              includeBusinessImpact: true,
            },
          },
          {
            type: 'update_task',
            fields: ['ai_priority_score', 'ai_insights'],
          },
        ],
      },
      triggerConditions: {
        projectIds: [webAppProject.id],
        excludeStatuses: ['done', 'cancelled'],
      },
      active: true,
      createdBy: janeUser.id,
    },
  })

  await prisma.claudeWorkflow.create({
    data: {
      organizationId: startupOrg.id,
      name: 'Smart Code Review Assistant',
      description: 'AI-powered code review with security and performance insights',
      workflowConfig: {
        triggers: ['task.status_change'],
        conditions: {
          newStatus: 'review',
          hasCodeAttachments: true,
        },
        actions: [
          {
            type: 'analyze_code',
            model: 'claude-3.5-sonnet',
            parameters: {
              checkSecurity: true,
              checkPerformance: true,
              checkBestPractices: true,
            },
          },
          {
            type: 'create_comment',
            template: 'code_review_summary',
          },
        ],
      },
      active: true,
      createdBy: aliceUser.id,
    },
  })

  console.log('✅ Database seeding completed successfully!')
  
  // Print summary
  console.log('\n📊 Seed Summary:')
  console.log(`   👥 Users: 5`)
  console.log(`   🏢 Organizations: 2`)
  console.log(`   👨‍💼 Teams: 3`)
  console.log(`   📋 Projects: 4`)
  console.log(`   📝 Tasks: 8`)
  console.log(`   💬 Comments: 5`)
  console.log(`   ⏰ Time Entries: 7`)
  console.log(`   🔔 Notifications: 4`)
  console.log(`   🤖 AI Analyses: 3`)
  console.log(`   🔄 Claude Workflows: 2`)
  
  console.log('\n🔐 Test Accounts:')
  console.log('   admin@cybertask.ai / admin123 (System Admin)')
  console.log('   john.doe@cybertask.ai / password123 (Org Owner)')
  console.log('   jane.smith@cybertask.ai / password123 (Project Manager)')
  console.log('   alice.johnson@cybertask.ai / password123 (Developer)')
  console.log('   bob.wilson@cybertask.ai / password123 (Developer)')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
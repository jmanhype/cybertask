# CyberTask C4 Architecture Diagrams

## C4 Model Overview
The C4 model provides a hierarchical approach to software architecture diagramming, with four levels of abstraction: Context, Container, Component, and Code. These diagrams visualize CyberTask's architecture from high-level business context to detailed implementation.

## Level 1: System Context Diagram

```mermaid
graph TB
    subgraph "External Systems"
        Gmail[Gmail API]
        Slack[Slack API]
        GitHub[GitHub API]
        Auth0[Auth0/OAuth Providers]
        CDN[Content Delivery Network]
        Monitoring[External Monitoring<br/>Datadog/New Relic]
    end

    subgraph "Users"
        PM[Project Manager]
        Dev[Developer]
        Admin[System Administrator]
        API_Client[API Client/Mobile App]
    end

    subgraph "CyberTask System"
        CyberTask[CyberTask Platform<br/>Task Management & AI Automation]
    end

    subgraph "Claude Flow Integration"
        ClaudeFlow[Claude Flow<br/>AI Orchestration Platform]
    end

    %% User interactions
    PM --> CyberTask
    Dev --> CyberTask
    Admin --> CyberTask
    API_Client --> CyberTask

    %% External system integrations
    CyberTask --> Gmail
    CyberTask --> Slack
    CyberTask --> GitHub
    CyberTask --> Auth0
    CyberTask --> CDN
    CyberTask --> Monitoring

    %% AI integration
    CyberTask --> ClaudeFlow
    ClaudeFlow --> CyberTask

    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef systemClass fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef externalClass fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class PM,Dev,Admin,API_Client userClass
    class CyberTask,ClaudeFlow systemClass
    class Gmail,Slack,GitHub,Auth0,CDN,Monitoring externalClass
```

### Context Description
- **CyberTask Platform**: The core system providing intelligent task management with AI-powered automation
- **Users**: Project managers, developers, and administrators accessing the platform via web and mobile interfaces
- **External Systems**: Third-party services for authentication, notifications, integrations, and monitoring
- **Claude Flow**: AI orchestration platform providing intelligent task analysis, workflow optimization, and natural language processing

## Level 2: Container Diagram

```mermaid
graph TB
    subgraph "User Devices"
        WebApp[Web Application<br/>React SPA]
        Mobile[Mobile App<br/>React Native]
        API_Tools[API Tools<br/>Postman/Custom]
    end

    subgraph "CyberTask Platform"
        subgraph "Frontend Layer"
            LB[Load Balancer<br/>NGINX/CloudFlare]
        end

        subgraph "Application Layer"
            Gateway[API Gateway<br/>Express.js]
            UserSvc[User Service<br/>Node.js/Express]
            TaskSvc[Task Service<br/>Node.js/Express]
            ProjectSvc[Project Service<br/>Node.js/Express]
            NotifSvc[Notification Service<br/>Node.js/Express]
            AnalyticsSvc[Analytics Service<br/>Node.js/Express]
            AISvc[AI Service<br/>Node.js/Claude Flow]
        end

        subgraph "Data Layer"
            MainDB[(Primary Database<br/>PostgreSQL)]
            CacheDB[(Cache Layer<br/>Redis Cluster)]
            SearchDB[(Search Engine<br/>Elasticsearch)]
            FileStore[File Storage<br/>S3/MinIO]
        end

        subgraph "Message Layer"
            EventBus[Event Bus<br/>Apache Kafka]
            Queue[Task Queue<br/>Redis/Bull]
        end

        subgraph "Infrastructure"
            Monitor[Monitoring<br/>Prometheus/Grafana]
            Logger[Logging<br/>ELK Stack]
        end
    end

    subgraph "External Services"
        OAuth[OAuth Providers<br/>Google/GitHub/MS]
        Email[Email Service<br/>SendGrid/SES]
        Push[Push Notifications<br/>Firebase/APNS]
        Claude[Claude Flow<br/>AI Platform]
    end

    %% User connections
    WebApp --> LB
    Mobile --> LB
    API_Tools --> LB

    %% Load balancer to gateway
    LB --> Gateway

    %% Gateway to services
    Gateway --> UserSvc
    Gateway --> TaskSvc
    Gateway --> ProjectSvc
    Gateway --> NotifSvc
    Gateway --> AnalyticsSvc
    Gateway --> AISvc

    %% Service to data connections
    UserSvc --> MainDB
    UserSvc --> CacheDB
    TaskSvc --> MainDB
    TaskSvc --> CacheDB
    TaskSvc --> SearchDB
    ProjectSvc --> MainDB
    ProjectSvc --> CacheDB
    NotifSvc --> CacheDB
    AnalyticsSvc --> MainDB
    AnalyticsSvc --> SearchDB
    AISvc --> MainDB
    AISvc --> CacheDB

    %% File storage connections
    TaskSvc --> FileStore
    ProjectSvc --> FileStore

    %% Event bus connections
    UserSvc --> EventBus
    TaskSvc --> EventBus
    ProjectSvc --> EventBus
    NotifSvc --> EventBus
    AnalyticsSvc --> EventBus
    AISvc --> EventBus

    %% Queue connections
    NotifSvc --> Queue
    AnalyticsSvc --> Queue
    AISvc --> Queue

    %% External service connections
    UserSvc --> OAuth
    NotifSvc --> Email
    NotifSvc --> Push
    AISvc --> Claude

    %% Infrastructure connections
    Gateway --> Monitor
    UserSvc --> Monitor
    TaskSvc --> Monitor
    ProjectSvc --> Monitor
    Gateway --> Logger
    UserSvc --> Logger
    TaskSvc --> Logger
    ProjectSvc --> Logger

    %% Styling
    classDef frontend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef service fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef data fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef infra fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

    class WebApp,Mobile,API_Tools,LB frontend
    class Gateway,UserSvc,TaskSvc,ProjectSvc,NotifSvc,AnalyticsSvc,AISvc service
    class MainDB,CacheDB,SearchDB,FileStore,EventBus,Queue data
    class OAuth,Email,Push,Claude external
    class Monitor,Logger infra
```

### Container Technologies
- **Frontend**: React 18, TypeScript, Vite, Material-UI
- **API Gateway**: Express.js with Helmet, Rate Limiting, CORS
- **Microservices**: Node.js, Express.js, TypeScript
- **Databases**: PostgreSQL 14, Redis 7, Elasticsearch 8
- **Message Systems**: Apache Kafka, Redis/Bull queues
- **Infrastructure**: Prometheus, Grafana, ELK Stack

## Level 3: Component Diagram - Task Service

```mermaid
graph TB
    subgraph "API Gateway"
        Router[Express Router<br/>Route Handler]
    end

    subgraph "Task Service Container"
        subgraph "Presentation Layer"
            TaskController[Task Controller<br/>HTTP Request Handler]
            WebSocketHandler[WebSocket Handler<br/>Real-time Updates]
            Middleware[Middleware<br/>Auth, Validation, Logging]
        end

        subgraph "Business Logic Layer"
            TaskManager[Task Manager<br/>Core Business Logic]
            WorkflowEngine[Workflow Engine<br/>Task State Management]
            AIIntegration[AI Integration<br/>Claude Flow Interface]
            ValidationService[Validation Service<br/>Input Sanitization]
        end

        subgraph "Data Access Layer"
            TaskRepository[Task Repository<br/>Database Operations]
            CacheManager[Cache Manager<br/>Redis Operations]
            SearchManager[Search Manager<br/>Elasticsearch Operations]
            FileManager[File Manager<br/>Attachment Handling]
        end

        subgraph "Integration Layer"
            EventPublisher[Event Publisher<br/>Kafka Producer]
            NotificationSender[Notification Sender<br/>Queue Publisher]
            ExternalAPIClient[External API Client<br/>Third-party Integrations]
        end
    end

    subgraph "Data Stores"
        TaskDB[(Task Database<br/>PostgreSQL)]
        TaskCache[(Task Cache<br/>Redis)]
        TaskSearch[(Task Search<br/>Elasticsearch)]
        FileStorage[File Storage<br/>S3/MinIO]
    end

    subgraph "External Systems"
        EventBus[Event Bus<br/>Kafka]
        NotifQueue[Notification Queue<br/>Redis]
        ClaudeAPI[Claude Flow API]
    end

    %% API Gateway to Service
    Router --> TaskController
    Router --> WebSocketHandler

    %% Controller Layer
    TaskController --> Middleware
    WebSocketHandler --> Middleware
    Middleware --> TaskManager

    %% Business Logic Layer
    TaskManager --> WorkflowEngine
    TaskManager --> AIIntegration
    TaskManager --> ValidationService
    TaskManager --> TaskRepository

    %% Data Access Layer
    TaskRepository --> TaskDB
    TaskManager --> CacheManager
    CacheManager --> TaskCache
    TaskManager --> SearchManager
    SearchManager --> TaskSearch
    TaskManager --> FileManager
    FileManager --> FileStorage

    %% Integration Layer
    TaskManager --> EventPublisher
    EventPublisher --> EventBus
    TaskManager --> NotificationSender
    NotificationSender --> NotifQueue
    AIIntegration --> ExternalAPIClient
    ExternalAPIClient --> ClaudeAPI

    %% Styling
    classDef presentation fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef business fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef data fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef integration fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

    class TaskController,WebSocketHandler,Middleware presentation
    class TaskManager,WorkflowEngine,AIIntegration,ValidationService business
    class TaskRepository,CacheManager,SearchManager,FileManager data
    class EventPublisher,NotificationSender,ExternalAPIClient integration
    class TaskDB,TaskCache,TaskSearch,FileStorage,EventBus,NotifQueue,ClaudeAPI external
```

### Component Responsibilities

#### Presentation Layer
- **Task Controller**: HTTP request handling, response formatting, error handling
- **WebSocket Handler**: Real-time updates, collaborative editing, live notifications
- **Middleware**: Authentication, authorization, input validation, request logging

#### Business Logic Layer
- **Task Manager**: Core task operations, business rule enforcement, workflow coordination
- **Workflow Engine**: Task state transitions, dependency management, automation rules
- **AI Integration**: Claude Flow interface, intelligent task analysis, natural language processing
- **Validation Service**: Input sanitization, business rule validation, security checks

#### Data Access Layer
- **Task Repository**: Database CRUD operations, query optimization, transaction management
- **Cache Manager**: Redis operations, cache invalidation, performance optimization
- **Search Manager**: Elasticsearch operations, full-text search, indexing
- **File Manager**: Attachment handling, file upload/download, storage management

## Level 4: Code Diagram - Task Manager Class

```mermaid
classDiagram
    class TaskManager {
        -taskRepository: TaskRepository
        -cacheManager: CacheManager
        -workflowEngine: WorkflowEngine
        -aiIntegration: AIIntegration
        -eventPublisher: EventPublisher
        -logger: Logger
        
        +createTask(taskData: CreateTaskDTO): Promise~Task~
        +updateTask(id: string, updates: UpdateTaskDTO): Promise~Task~
        +getTask(id: string): Promise~Task~
        +deleteTask(id: string): Promise~boolean~
        +getTasks(filters: TaskFilters): Promise~Task[]~
        +assignTask(taskId: string, userId: string): Promise~Task~
        +changeTaskStatus(taskId: string, status: TaskStatus): Promise~Task~
        +addComment(taskId: string, comment: CommentDTO): Promise~Comment~
        -validateTaskData(taskData: any): ValidationResult
        -enrichTaskWithAI(task: Task): Promise~Task~
        -publishTaskEvent(event: TaskEvent): Promise~void~
    }

    class WorkflowEngine {
        -rules: WorkflowRule[]
        -stateManager: StateManager
        
        +executeTransition(task: Task, newStatus: TaskStatus): Promise~Task~
        +validateTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean
        +getAvailableTransitions(task: Task): TaskStatus[]
        +applyBusinessRules(task: Task): Promise~Task~
        -checkDependencies(task: Task): Promise~boolean~
        -triggerAutomation(task: Task): Promise~void~
    }

    class AIIntegration {
        -claudeFlowClient: ClaudeFlowClient
        -analysisCache: Map~string, AIAnalysis~
        
        +analyzeTask(task: Task): Promise~AIAnalysis~
        +generateTaskRecommendations(task: Task): Promise~Recommendation[]~
        +estimateTaskComplexity(task: Task): Promise~ComplexityScore~
        +parseNaturalLanguageTask(description: string): Promise~TaskData~
        +optimizeWorkflow(tasks: Task[]): Promise~WorkflowOptimization~
        -cacheAnalysis(taskId: string, analysis: AIAnalysis): void
        -getCachedAnalysis(taskId: string): AIAnalysis | null
    }

    class TaskRepository {
        -database: Database
        -queryBuilder: QueryBuilder
        
        +create(task: CreateTaskDTO): Promise~Task~
        +findById(id: string): Promise~Task | null~
        +update(id: string, updates: UpdateTaskDTO): Promise~Task~
        +delete(id: string): Promise~boolean~
        +findByFilters(filters: TaskFilters): Promise~Task[]~
        +findByProject(projectId: string): Promise~Task[]~
        +findByAssignee(userId: string): Promise~Task[]~
        +search(query: SearchQuery): Promise~SearchResult~
        -buildQuery(filters: TaskFilters): QueryObject
        -applyPagination(query: QueryObject, pagination: Pagination): QueryObject
    }

    class EventPublisher {
        -kafkaClient: KafkaClient
        -eventSchema: EventSchema
        
        +publishTaskCreated(task: Task): Promise~void~
        +publishTaskUpdated(task: Task, changes: TaskChanges): Promise~void~
        +publishTaskDeleted(taskId: string): Promise~void~
        +publishTaskStatusChanged(task: Task, oldStatus: TaskStatus): Promise~void~
        +publishTaskAssigned(task: Task, assignee: User): Promise~void~
        -validateEvent(event: TaskEvent): ValidationResult
        -serializeEvent(event: TaskEvent): string
    }

    class CacheManager {
        -redisClient: RedisClient
        -serializer: Serializer
        
        +get~T~(key: string): Promise~T | null~
        +set~T~(key: string, value: T, ttl?: number): Promise~void~
        +delete(key: string): Promise~void~
        +invalidatePattern(pattern: string): Promise~void~
        +exists(key: string): Promise~boolean~
        +increment(key: string): Promise~number~
        -generateKey(prefix: string, id: string): string
        -serialize~T~(value: T): string
        -deserialize~T~(value: string): T
    }

    TaskManager --> TaskRepository: uses
    TaskManager --> CacheManager: uses
    TaskManager --> WorkflowEngine: uses
    TaskManager --> AIIntegration: uses
    TaskManager --> EventPublisher: uses

    WorkflowEngine --> TaskRepository: reads
    AIIntegration --> CacheManager: caches analysis
    EventPublisher --> TaskRepository: reads task data
```

### Class Relationships and Patterns

#### Design Patterns Used
1. **Repository Pattern**: TaskRepository abstracts data access
2. **Strategy Pattern**: WorkflowEngine uses configurable rules
3. **Observer Pattern**: EventPublisher notifies subscribers
4. **Cache-Aside Pattern**: CacheManager provides caching layer
5. **Facade Pattern**: TaskManager provides simplified interface

#### Key Interfaces
```typescript
interface TaskManager {
  createTask(taskData: CreateTaskDTO): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskDTO): Promise<Task>;
  getTask(id: string): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
}

interface WorkflowEngine {
  executeTransition(task: Task, newStatus: TaskStatus): Promise<Task>;
  validateTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean;
}

interface AIIntegration {
  analyzeTask(task: Task): Promise<AIAnalysis>;
  generateTaskRecommendations(task: Task): Promise<Recommendation[]>;
}
```

## Deployment Architecture Diagram

```mermaid
graph TB
    subgraph "Production Environment - AWS"
        subgraph "CDN Layer"
            CloudFront[CloudFront CDN<br/>Global Distribution]
        end

        subgraph "Load Balancing Layer"
            ALB[Application Load Balancer<br/>SSL Termination]
        end

        subgraph "Kubernetes Cluster - EKS"
            subgraph "Ingress"
                Istio[Istio Gateway<br/>Service Mesh]
            end

            subgraph "Application Pods"
                WebPod[Web App Pods<br/>3 replicas]
                APIPod[API Gateway Pods<br/>3 replicas]
                UserPod[User Service Pods<br/>2 replicas]
                TaskPod[Task Service Pods<br/>5 replicas]
                ProjectPod[Project Service Pods<br/>2 replicas]
                AIPod[AI Service Pods<br/>3 replicas]
            end

            subgraph "Infrastructure Pods"
                MonitorPod[Monitoring<br/>Prometheus/Grafana]
                LoggingPod[Logging<br/>Fluent Bit]
            end
        end

        subgraph "Data Layer"
            RDS[RDS PostgreSQL<br/>Multi-AZ Primary]
            RDSRead[RDS Read Replicas<br/>2 instances]
            ElastiCache[ElastiCache Redis<br/>Cluster Mode]
            ES[Elasticsearch Service<br/>3 node cluster]
        end

        subgraph "Storage Layer"
            S3Primary[S3 Primary Bucket<br/>Files & Backups]
            S3Logs[S3 Logs Bucket<br/>Access & App Logs]
        end

        subgraph "Message Layer"
            MSK[Amazon MSK<br/>Kafka Cluster]
        end
    end

    subgraph "External Services"
        Route53[Route53 DNS]
        SES[Simple Email Service]
        SNS[Simple Notification Service]
        Claude[Claude Flow API]
    end

    subgraph "Monitoring & Security"
        CloudWatch[CloudWatch<br/>Metrics & Alarms]
        GuardDuty[GuardDuty<br/>Threat Detection]
        WAF[Web Application Firewall]
        Secrets[AWS Secrets Manager]
    end

    %% Traffic flow
    Route53 --> CloudFront
    CloudFront --> WAF
    WAF --> ALB
    ALB --> Istio
    Istio --> WebPod
    Istio --> APIPod

    %% Service mesh routing
    APIPod --> UserPod
    APIPod --> TaskPod
    APIPod --> ProjectPod
    APIPod --> AIPod

    %% Data connections
    UserPod --> RDS
    TaskPod --> RDS
    TaskPod --> RDSRead
    ProjectPod --> RDS
    AIPod --> RDS

    %% Cache connections
    UserPod --> ElastiCache
    TaskPod --> ElastiCache
    ProjectPod --> ElastiCache
    AIPod --> ElastiCache

    %% Search connections
    TaskPod --> ES
    ProjectPod --> ES

    %% Storage connections
    TaskPod --> S3Primary
    ProjectPod --> S3Primary
    AIPod --> S3Primary

    %% Messaging
    TaskPod --> MSK
    ProjectPod --> MSK
    AIPod --> MSK

    %% External services
    UserPod --> SES
    TaskPod --> SNS
    AIPod --> Claude

    %% Monitoring
    MonitorPod --> CloudWatch
    LoggingPod --> S3Logs
    GuardDuty --> CloudWatch

    %% Secrets
    UserPod --> Secrets
    TaskPod --> Secrets
    AIPod --> Secrets

    %% Styling
    classDef cdn fill:#ff9800,color:#fff,stroke:#f57c00,stroke-width:2px
    classDef lb fill:#2196f3,color:#fff,stroke:#1976d2,stroke-width:2px
    classDef app fill:#4caf50,color:#fff,stroke:#388e3c,stroke-width:2px
    classDef data fill:#9c27b0,color:#fff,stroke:#7b1fa2,stroke-width:2px
    classDef external fill:#f44336,color:#fff,stroke:#d32f2f,stroke-width:2px
    classDef monitoring fill:#795548,color:#fff,stroke:#5d4037,stroke-width:2px

    class CloudFront,WAF cdn
    class ALB,Istio lb
    class WebPod,APIPod,UserPod,TaskPod,ProjectPod,AIPod app
    class RDS,RDSRead,ElastiCache,ES,S3Primary,S3Logs,MSK data
    class Route53,SES,SNS,Claude external
    class MonitorPod,LoggingPod,CloudWatch,GuardDuty,Secrets monitoring
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant G as API Gateway
    participant T as Task Service
    participant A as AI Service
    participant D as Database
    participant C as Cache
    participant E as Event Bus
    participant N as Notification Service

    U->>W: Create Task Request
    W->>G: POST /api/tasks
    G->>G: Authenticate & Authorize
    G->>T: Forward Request
    T->>T: Validate Input
    T->>A: Analyze Task (async)
    T->>D: Save Task
    T->>C: Cache Task
    T->>E: Publish TaskCreated Event
    T->>G: Return Task Response
    G->>W: Task Created Response
    W->>U: Show Success Message

    A->>A: Process AI Analysis
    A->>D: Save AI Insights
    A->>C: Update Task Cache
    A->>E: Publish AIAnalysisComplete Event

    E->>N: TaskCreated Event
    N->>N: Process Notifications
    N->>U: Push Notification
    N->>U: Email Notification (if configured)

    Note over U,N: Real-time updates via WebSocket
    T->>W: WebSocket: Task Updated
    W->>U: Live UI Update
```

These C4 diagrams provide a comprehensive view of CyberTask's architecture at multiple levels of detail, from high-level system context to detailed code structure. They serve as living documentation for the development team and stakeholders to understand the system's design and evolution.
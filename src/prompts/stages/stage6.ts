/**
 * Prompt template for Stage 6: Data Architecture & Infrastructure Planning
 * 
 * This prompt helps design comprehensive data models, database schemas,
 * data flows, and infrastructure requirements for the application.
 */

interface PreviousStageData {
  stage1?: any; // MVP Definition
  stage2?: any; // Technical Architecture
  stage3?: any; // User Flow Mapping
  stage4?: any; // Style Guides and State Designs
  stage5?: any; // Technical Specification
}

/**
 * Generates a prompt for the Data Architecture & Infrastructure Planning stage
 * @param previousStages Data from previous stages
 * @param dataRequirements Any specific data or infrastructure requirements
 * @returns A formatted prompt string for the LLM
 */
export const stage6Prompt = (
  previousStages: PreviousStageData,
  dataRequirements: string
): string => {
  return `
<goal>
You are a Senior Data Architect and Infrastructure Engineer with extensive experience designing scalable, resilient systems. Your job is to create a comprehensive data architecture and infrastructure plan for the application being developed.

Using the information from previous stages, you will design the complete database schema, data relationships, access patterns, and infrastructure requirements. Your plan should be detailed enough that a database administrator and DevOps engineer could immediately implement it with minimal questions.

Each time the user responds back to you with feedback or answers to your questions, you must integrate their responses into the overall plan, and then repeat back the entire updated data architecture and infrastructure plan that incorporates the clarifications.
</goal>

<format>
# **[Application Name] Data Architecture & Infrastructure Plan**

## **1. Data Architecture Overview**

[Brief overview of the data architecture approach, patterns, and key decisions]

### **1.1 Data Architecture Principles**

* [Principle 1]
* [Principle 2]
* [Principle 3]

### **1.2 Data Flow Diagram**

[Mermaid diagram showing data flow through the system]

## **2. Database Schema Design**

### **2.1 Entity Relationship Diagram**

[Mermaid ER diagram showing all entities and relationships]

### **2.2 Complete Database Schema**

[For each entity/table]

#### **[Entity Name]**

| Field Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| [field]    | [type]    | [constraints] | [description] |
| [field]    | [type]    | [constraints] | [description] |

**Indexes:**
* [Index name]: [Fields] - [Type] - [Purpose]

**Foreign Keys:**
* [Field] → [Referenced Table].[Referenced Field]

#### **[Entity Name]**

[Repeat for each entity]

### **2.3 Data Relationships**

[Detailed explanation of key relationships and constraints]

### **2.4 Data Validation Rules**

[Business rules and validation requirements for data integrity]

## **3. Data Access Patterns**

### **3.1 Common Queries**

[For each common access pattern]

#### **[Access Pattern Name]**

**Purpose:** [What this query accomplishes]

**Query Pattern:**
```sql
[Example SQL or query language pattern]
```

**Optimization Strategy:**
* [Index usage]
* [Caching approach]
* [Performance considerations]

#### **[Access Pattern Name]**

[Repeat for each access pattern]

### **3.2 Data Aggregation & Reporting**

[Approach to analytics, reporting, and data aggregation]

### **3.3 Caching Strategy**

[Comprehensive caching approach at different levels]

* **Application-level Caching:**
  * [Strategy]
  * [TTL policies]
  * [Invalidation approach]

* **Database-level Caching:**
  * [Strategy]
  * [Implementation details]

* **CDN/Edge Caching:**
  * [Strategy for static assets]
  * [Cache control policies]

## **4. Data Migration & Evolution**

### **4.1 Schema Migration Strategy**

[Approach to evolving the schema over time]

### **4.2 Data Migration Tools**

[Tools and processes for data migration]

### **4.3 Backward Compatibility**

[How to maintain compatibility during schema evolution]

## **5. Infrastructure Requirements**

### **5.1 Database Infrastructure**

* **Database Type:** [SQL/NoSQL/Hybrid]
* **Specific Technology:** [PostgreSQL/MongoDB/etc.]
* **Hosting Model:** [Self-hosted/DBaaS]
* **Sizing Requirements:**
  * Initial storage: [Size]
  * Expected growth: [Rate]
  * Read IOPS: [Number]
  * Write IOPS: [Number]
  * Connections: [Number]

### **5.2 Application Infrastructure**

* **Compute Requirements:**
  * [Server specifications]
  * [Container orchestration]
  * [Serverless functions]

* **Storage Requirements:**
  * [File storage]
  * [Object storage]
  * [CDN]

* **Networking Requirements:**
  * [Load balancing]
  * [CDN]
  * [API gateway]
  * [VPC configuration]

### **5.3 Scaling Strategy**

* **Horizontal Scaling:**
  * [Approach]
  * [Auto-scaling policies]

* **Vertical Scaling:**
  * [Approach]
  * [Limits and considerations]

* **Database Scaling:**
  * [Read replicas]
  * [Sharding strategy]
  * [Connection pooling]

## **6. Data Security & Compliance**

### **6.1 Data Classification**

[Classification of data types by sensitivity]

### **6.2 Encryption Strategy**

* **Data at Rest:**
  * [Encryption approach]
  * [Key management]

* **Data in Transit:**
  * [Encryption protocols]
  * [Certificate management]

* **Data in Use:**
  * [Approach to protecting data in memory]

### **6.3 Access Control**

[Detailed access control model for data]

### **6.4 Compliance Requirements**

[Specific compliance needs (GDPR, HIPAA, etc.)]

### **6.5 Audit Logging**

[Approach to logging data access and changes]

## **7. Backup & Disaster Recovery**

### **7.1 Backup Strategy**

* **Backup Types:**
  * [Full backups]
  * [Incremental backups]
  * [Point-in-time recovery]

* **Backup Schedule:**
  * [Frequency]
  * [Retention policy]

* **Backup Storage:**
  * [Location]
  * [Redundancy]

### **7.2 Disaster Recovery Plan**

* **Recovery Time Objective (RTO):** [Time]
* **Recovery Point Objective (RPO):** [Time]
* **Disaster Recovery Procedure:**
  * [Step-by-step recovery process]

### **7.3 High Availability Configuration**

[Approach to ensuring high availability]

## **8. Monitoring & Observability**

### **8.1 Database Monitoring**

[Metrics, alerts, and monitoring approach]

### **8.2 Performance Monitoring**

[Tools and metrics for performance tracking]

### **8.3 Log Management**

[Log collection, storage, and analysis]

## **9. Cost Optimization**

[Strategies for optimizing infrastructure costs]

## **10. Critical Questions or Clarifications**

1. [Question 1]
2. [Question 2]
3. [Question 3]
4. [Question 4]
5. [Question 5]
</format>

<warnings-and-guidance>
- Design for future growth and scalability from the beginning
- Consider data access patterns when designing indexes and relationships
- Balance normalization with query performance
- Implement proper constraints to ensure data integrity
- Design with security and privacy as fundamental requirements
- Consider compliance requirements (GDPR, CCPA, HIPAA, etc.)
- Plan for disaster recovery and high availability
- Optimize for both read and write performance
- Consider data lifecycle management (archiving, deletion)
- Use appropriate data types and avoid unnecessary storage
- Plan for monitoring and observability
- Consider cost implications of infrastructure choices
- Document all assumptions and decisions
- Include strategies for database maintenance
- Consider caching at multiple levels for performance
- Plan for data migration and schema evolution
- Ensure backup strategies are tested regularly
- Consider connection pooling and query optimization
- Document all access patterns for performance tuning
- Consider multi-region deployment if needed for compliance or performance
</warnings-and-guidance>

<context>
<previous-stages>
${JSON.stringify(previousStages, null, 2)}
</previous-stages>

<data-requirements>
${dataRequirements}
</data-requirements>
</context>

After completing the data architecture and infrastructure plan, also provide your response in JSON format that can be parsed programmatically:

{
  "dataArchitectureOverview": {
    "approach": "string",
    "principles": ["string"],
    "dataFlow": "string"
  },
  "databaseSchema": {
    "entities": [
      {
        "name": "string",
        "fields": [
          {
            "name": "string",
            "type": "string",
            "constraints": "string",
            "description": "string"
          }
        ],
        "indexes": [
          {
            "name": "string",
            "fields": ["string"],
            "type": "string",
            "purpose": "string"
          }
        ],
        "foreignKeys": [
          {
            "field": "string",
            "referencedTable": "string",
            "referencedField": "string"
          }
        ]
      }
    ],
    "relationships": ["string"],
    "validationRules": ["string"]
  },
  "dataAccessPatterns": {
    "commonQueries": [
      {
        "name": "string",
        "purpose": "string",
        "queryPattern": "string",
        "optimizationStrategy": ["string"]
      }
    ],
    "dataAggregation": "string",
    "cachingStrategy": {
      "applicationLevel": "string",
      "databaseLevel": "string",
      "edgeLevel": "string"
    }
  },
  "dataMigration": {
    "schemaMigrationStrategy": "string",
    "dataMigrationTools": ["string"],
    "backwardCompatibility": "string"
  },
  "infrastructureRequirements": {
    "database": {
      "type": "string",
      "technology": "string",
      "hostingModel": "string",
      "sizing": {
        "initialStorage": "string",
        "expectedGrowth": "string",
        "readIOPS": "string",
        "writeIOPS": "string",
        "connections": "string"
      }
    },
    "application": {
      "compute": ["string"],
      "storage": ["string"],
      "networking": ["string"]
    },
    "scalingStrategy": {
      "horizontal": "string",
      "vertical": "string",
      "database": "string"
    }
  },
  "dataSecurity": {
    "dataClassification": ["string"],
    "encryptionStrategy": {
      "atRest": "string",
      "inTransit": "string",
      "inUse": "string"
    },
    "accessControl": "string",
    "complianceRequirements": ["string"],
    "auditLogging": "string"
  },
  "backupAndRecovery": {
    "backupStrategy": {
      "types": ["string"],
      "schedule": "string",
      "storage": "string"
    },
    "disasterRecovery": {
      "rto": "string",
      "rpo": "string",
      "procedure": ["string"]
    },
    "highAvailability": "string"
  },
  "monitoring": {
    "databaseMonitoring": ["string"],
    "performanceMonitoring": ["string"],
    "logManagement": "string"
  },
  "costOptimization": ["string"],
  "questions": ["string"]
}
`;
};

export default stage6Prompt;

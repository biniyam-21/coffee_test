# Candidate Submission Cover Sheet

Complete this cover sheet after confirming the final release and collecting evidence. Values marked as candidate tasks are intentionally not inferred.

| Assessment field | Candidate entry |
|---|---|
| Candidate name | Biniyam Tesfu |
| Assessment case | Coffee Shop Order Management Application |
| Technology stack and versions | Node.js runtime used for this assessment: not runtime-verified. Source manifests specify NestJS 10, React 18/Vite 5, PostgreSQL 16 image, Prisma 5, Expo SDK 58, React Native 0.88, TypeScript. Confirm installed tool versions and update before submission. |
| Repository and release tag | Local repository exists at C:\Users\biniyam\Desktop\Akufada; branch main, inspected HEAD c6eb602. Remote URL and release tag: TO BE COMPLETED BY CANDIDATE. No tag was found. |
| Application endpoints | Local development values described in setup guide (localhost:3000, localhost:3001, /api/v1/docs). Deployed endpoints: TO BE COMPLETED BY CANDIDATE; none verified. |
| Service inventory and VM inventory (if used) | Docker Compose defines PostgreSQL, migration job, two API nodes, web client, mock payment service and Nginx gateway. VM inventory: not applicable unless candidate uses VMs; confirm actual demo topology. |
| Database and replication configuration | PostgreSQL 16 Alpine in Compose; Prisma schema/migrations. Single primary configured. No read replica or replication config found. Confirm actual local setup. |
| Physical mobile device used | TO BE COMPLETED BY CANDIDATE. No physical device demonstration verified. |
| Implemented requirements | See 01-requirement-traceability.md; source contains customer, staff and admin workflows, versioned API, payment integrations, database migrations, Docker and supporting scripts. Runtime verification remains outstanding. |
| Known limitations | See traceability and technical packs. Notably: no configured replica or monitoring/alerting stack; no verified release/tag, PR evidence, physical-device proof, deployment endpoint, restore result, or upgrade/rollback rehearsal. Structured item customization not found. |
| External sources, reused components, and assistance disclosed | Dependencies and integrations are listed in package manifests and deployment files. AI assistance was used to draft this submission documentation from repository and assessment inspection. Candidate must review and confirm the exact disclosure, identify any other reused code/templates/services, and correct this entry before signing. |
| Deployment and test evidence location | submission-package/evidence/ checklist. Actual evidence has not yet been captured here. |

## Candidate review before declaration

Confirm all version and endpoint values against the actual machine and final release. Replace placeholders with real facts, disclose all external sources and assistance, verify the repository link, and remove any sensitive material from submitted evidence. Do not sign until the declaration and all disclosures have been reviewed personally.

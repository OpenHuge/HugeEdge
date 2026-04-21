export const adminOpenApi = `
openapi: 3.1.0
info:
  title: HugeEdge Admin API
  version: 0.2.0
servers:
  - url: http://localhost:8080
paths:
  /v1/auth/login:
    post:
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LoginRequest"
      responses:
        "200":
          description: Authenticated session
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthTokens"
  /v1/auth/refresh:
    post:
      operationId: refresh
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RefreshRequest"
      responses:
        "200":
          description: Rotated tokens
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthTokens"
  /v1/auth/logout:
    post:
      operationId: logout
      responses:
        "204":
          description: Logged out
  /v1/app/me:
    get:
      operationId: getMe
      responses:
        "200":
          description: Current actor
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Actor"
  /v1/admin/tenants:
    get:
      operationId: listTenants
      responses:
        "200":
          description: Tenants
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Tenant"
    post:
      operationId: createTenant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateTenantRequest"
      responses:
        "201":
          description: Tenant created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Tenant"
  /v1/admin/tenants/{tenantId}:
    get:
      operationId: getTenant
      parameters:
        - $ref: "#/components/parameters/TenantId"
      responses:
        "200":
          description: Tenant detail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Tenant"
  /v1/admin/nodes:
    get:
      operationId: listNodes
      responses:
        "200":
          description: Nodes
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Node"
  /v1/admin/nodes/{nodeId}:
    get:
      operationId: getNode
      parameters:
        - $ref: "#/components/parameters/NodeId"
      responses:
        "200":
          description: Node detail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Node"
  /v1/admin/nodes/bootstrap-tokens:
    post:
      operationId: createBootstrapToken
      responses:
        "201":
          description: Bootstrap token
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/BootstrapToken"
  /v1/admin/rollouts:
    get:
      operationId: listRollouts
      parameters:
        - name: nodeId
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: Config rollouts
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Rollout"
    post:
      operationId: createRollout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateRolloutRequest"
      responses:
        "201":
          description: Rollout created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Rollout"
  /v1/admin/rollouts/{rolloutId}:
    get:
      operationId: getRollout
      parameters:
        - $ref: "#/components/parameters/RolloutId"
      responses:
        "200":
          description: Rollout detail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Rollout"
  /v1/admin/rollouts/{rolloutId}/rollback:
    post:
      operationId: rollbackRollout
      parameters:
        - $ref: "#/components/parameters/RolloutId"
      responses:
        "201":
          description: Rollback rollout created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Rollout"
  /v1/admin/capabilities:
    get:
      operationId: listCapabilities
      responses:
        "200":
          description: Capability registry
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Capability"
  /v1/admin/audit-logs:
    get:
      operationId: listAuditLogs
      responses:
        "200":
          description: Audit logs
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/AuditLog"
  /v1/admin/providers:
    get:
      operationId: listProviders
      responses:
        "200":
          description: Seeded providers
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Provider"
  /v1/admin/regions:
    get:
      operationId: listRegions
      responses:
        "200":
          description: Seeded regions
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Region"
components:
  parameters:
    TenantId:
      name: tenantId
      in: path
      required: true
      schema:
        type: string
    NodeId:
      name: nodeId
      in: path
      required: true
      schema:
        type: string
    RolloutId:
      name: rolloutId
      in: path
      required: true
      schema:
        type: string
  schemas:
    Actor:
      type: object
      required: [id, email, tenantId, roleIds, sessionId]
      properties:
        id:
          type: string
        email:
          type: string
        tenantId:
          type: string
        roleIds:
          type: array
          items:
            type: string
        sessionId:
          type: string
    AuthTokens:
      type: object
      required: [accessToken, refreshToken, expiresIn]
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        expiresIn:
          type: integer
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
    RefreshRequest:
      type: object
      required: [refreshToken]
      properties:
        refreshToken:
          type: string
    CreateTenantRequest:
      type: object
      required: [name, slug]
      properties:
        name:
          type: string
        slug:
          type: string
    CreateRolloutRequest:
      type: object
      required: [nodeId, adapterName, config]
      properties:
        nodeId:
          type: string
        adapterName:
          type: string
          const: xray-adapter
        config:
          type: object
          additionalProperties: true
        note:
          type: string
    Tenant:
      type: object
      required: [id, name, slug, status, createdAt]
      properties:
        id:
          type: string
        name:
          type: string
        slug:
          type: string
        status:
          type: string
        createdAt:
          type: string
          format: date-time
    Node:
      type: object
      required:
        - id
        - tenantId
        - name
        - status
        - adapterName
        - agentVersion
        - runtimeVersion
        - healthStatus
        - healthScore
        - createdAt
      properties:
        id:
          type: string
        tenantId:
          type: string
        name:
          type: string
        status:
          type: string
        adapterName:
          type: string
          const: xray-adapter
        agentVersion:
          type: string
        runtimeVersion:
          type: string
        healthStatus:
          type: string
        healthScore:
          type: integer
        currentConfigVersion:
          type: integer
        desiredConfigVersion:
          type: integer
        lastApplyStatus:
          type: string
        lastApplyMessage:
          type: string
        lastApplyAt:
          type: string
          format: date-time
        lastHeartbeatAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
    Rollout:
      type: object
      required:
        - id
        - tenantId
        - nodeId
        - nodeName
        - bundleVersion
        - adapterName
        - status
        - note
        - hash
        - createdAt
      properties:
        id:
          type: string
        tenantId:
          type: string
        nodeId:
          type: string
        nodeName:
          type: string
        bundleVersion:
          type: integer
        config:
          type: object
          additionalProperties: true
        hash:
          type: string
        adapterName:
          type: string
          const: xray-adapter
        status:
          type: string
        note:
          type: string
        createdBy:
          type: string
        rollbackOfRolloutId:
          type: string
        completedAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        lastApplyStatus:
          type: string
        lastApplyMessage:
          type: string
        healthStatus:
          type: string
        healthScore:
          type: integer
        agentVersion:
          type: string
        runtimeVersion:
          type: string
    BootstrapToken:
      type: object
      required: [token, expiresAt]
      properties:
        token:
          type: string
        expiresAt:
          type: string
          format: date-time
    Capability:
      type: object
      required: [name, version, source]
      properties:
        name:
          type: string
        version:
          type: string
        source:
          type: string
    AuditLog:
      type: object
      required: [id, action, actorId, createdAt]
      properties:
        id:
          type: string
        action:
          type: string
        actorId:
          type: string
        tenantId:
          type: string
        metadata:
          type: object
          additionalProperties: true
        createdAt:
          type: string
          format: date-time
    Provider:
      type: object
      required: [id, name, slug]
      properties:
        id:
          type: string
        name:
          type: string
        slug:
          type: string
    Region:
      type: object
      required: [id, providerId, name, code]
      properties:
        id:
          type: string
        providerId:
          type: string
        name:
          type: string
        code:
          type: string
`;

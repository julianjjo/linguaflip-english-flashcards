/**
 * Migration Schema Definition for MongoDB
 *
 * This schema defines the structure for migration tracking documents in the LinguaFlip application.
 * It includes migration metadata, version tracking, and success/failure information.
 */

/**
 * Migration tracking schema
 */
export const MigrationSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['migrationId', 'version', 'description', 'appliedAt'],
      properties: {
        migrationId: {
          bsonType: 'string',
          description: 'Unique migration identifier',
        },
        version: {
          bsonType: 'string',
          description: 'Schema version',
        },
        description: {
          bsonType: 'string',
          description: 'Migration description',
        },
        appliedAt: {
          bsonType: 'date',
          description: 'Migration application timestamp',
        },
        checksum: {
          bsonType: 'string',
          description: 'Migration checksum for validation',
        },
        success: {
          bsonType: 'bool',
          description: 'Migration success status',
        },
        error: {
          bsonType: 'string',
          description: 'Migration error message',
        },
      },
    },
  },
};

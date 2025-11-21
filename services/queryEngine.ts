import { executeSelect, executeInsert, executeUpdate, executeDelete } from './firebaseService';
import { QueryResult } from '../types';

/**
 * A simple regex-based parser for a SQL dialect tailored for Firestore.
 * 
 * Supported Syntax:
 * SELECT * FROM collection [WHERE field = value]
 * INSERT INTO collection JSON {"key": "value"}
 * UPDATE collection SET JSON {"key": "newVal"} WHERE id = 'docId'
 * DELETE FROM collection WHERE id = 'docId'
 */

const cleanString = (str: string) => str.trim();
const removeQuotes = (str: string) => str.replace(/^['"]|['"]$/g, '');

export const runQuery = async (queryString: string): Promise<QueryResult> => {
  const q = queryString.trim();

  try {
    // --- SELECT ---
    // Regex: SELECT * FROM <collection> [WHERE <field> <op> <value>]
    const selectRegex = /^SELECT\s+\*\s+FROM\s+([a-zA-Z0-9_/-]+)(?:\s+WHERE\s+([a-zA-Z0-9_.]+)\s*(=|!=|>|<|>=|<=)\s*(.+))?$/i;
    const selectMatch = q.match(selectRegex);

    if (selectMatch) {
      const collection = selectMatch[1];
      const whereField = selectMatch[2];
      const whereOp = selectMatch[3];
      const whereVal = selectMatch[4];

      let whereClause = undefined;
      if (whereField && whereOp && whereVal) {
        whereClause = { field: whereField, op: whereOp, value: whereVal };
      }

      const data = await executeSelect(collection, whereClause);

      const columns = data.length > 0 ? ['id', ...Object.keys(data[0]).filter(k => k !== 'id')] : ['id'];

      return {
        type: 'read',
        columns,
        rows: data,
        message: `Fetched ${data.length} documents from '${collection}'`,
        collectionName: collection
      };
    }

    // --- INSERT ---
    // Regex: INSERT INTO <collection> JSON <json_string>
    const insertRegex = /^INSERT\s+INTO\s+([a-zA-Z0-9_/-]+)\s+JSON\s+(.+)$/i;
    const insertMatch = q.match(insertRegex);

    if (insertMatch) {
      const collection = insertMatch[1];
      const jsonStr = insertMatch[2];
      let jsonData;
      try {
        jsonData = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("Invalid JSON in INSERT statement.");
      }

      const result = await executeInsert(collection, jsonData);
      return {
        type: 'write',
        columns: ['id', 'status'],
        rows: [{ id: result.id, status: 'Created' }],
        message: `Document created in '${collection}' with ID: ${result.id}`,
        collectionName: collection
      };
    }

    // --- UPDATE ---
    // Regex: UPDATE <collection> SET JSON <json_string> WHERE id = <value>
    const updateRegex = /^UPDATE\s+([a-zA-Z0-9_/-]+)\s+SET\s+JSON\s+(.+)\s+WHERE\s+id\s*=\s*(.+)$/i;
    const updateMatch = q.match(updateRegex);

    if (updateMatch) {
      const collection = updateMatch[1];
      const jsonStr = updateMatch[2];
      const rawId = updateMatch[3];
      const docId = removeQuotes(rawId);

      let jsonData;
      try {
        jsonData = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("Invalid JSON in UPDATE statement.");
      }

      await executeUpdate(collection, docId, jsonData);
      return {
        type: 'write',
        columns: ['id', 'status'],
        rows: [{ id: docId, status: 'Updated' }],
        message: `Document '${docId}' updated in '${collection}'`,
        collectionName: collection
      };
    }

    // --- DELETE ---
    // Regex: DELETE FROM <collection> WHERE id = <value>
    const deleteRegex = /^DELETE\s+FROM\s+([a-zA-Z0-9_/-]+)\s+WHERE\s+id\s*=\s*(.+)$/i;
    const deleteMatch = q.match(deleteRegex);

    if (deleteMatch) {
      const collection = deleteMatch[1];
      const rawId = deleteMatch[2];
      const docId = removeQuotes(rawId);

      await executeDelete(collection, docId);
      return {
        type: 'write',
        columns: ['id', 'status'],
        rows: [{ id: docId, status: 'Deleted' }],
        message: `Document '${docId}' deleted from '${collection}'`,
        collectionName: collection
      };
    }

    throw new Error("Syntax error: Query not recognized. Use SELECT, INSERT, UPDATE, or DELETE with supported syntax.");

  } catch (err: any) {
    return {
      type: 'error',
      columns: [],
      rows: [],
      message: err.message || "Unknown error occurred"
    };
  }
};
# Implementation Plan - Found Reports and Handover Routes

Adding new endpoints for found reports (by students) and physical item handover (by admin).

## User Review Required

> [!IMPORTANT]
> - A new table `found_reports` will be created to track reports made by students who find items already listed as "lost".
> - The `items` table status constraint will be updated to include a `found` status.
> - The `claims` table will be updated with new columns for handover details (latitude, longitude, photo URL, and timestamp).
> - New routes will be added to `adminRoutes.js` and `studentRoutes.js`.

## Proposed Changes

### Database Migrations

#### [NEW] [005_found_reports_and_handover.sql](file:///d:/Lost_found/Lost_Found/migrations/005_found_reports_and_handover.sql)
- Update `items` table `status` CHECK constraint to include `found`.
- Create `found_reports` table.
- Add handover columns to `claims` table: `handover_lat`, `handover_lng`, `handover_photo_url`, `handed_over_at`.

### Controllers

#### [NEW] [foundReportController.js](file:///d:/Lost_found/Lost_Found/src/controllers/foundReportController.js)
- `submitFoundReport`: Handles student reporting they found a lost item.
- `getFoundReportsAdmin`: Allows admins to fetch all found reports (supports `?status=pending`).
- `updateFoundReportStatus`: Allows admins to approve or reject a found report. If approved, updates the original item status to `found`.

#### [MODIFY] [adminController.js](file:///d:/Lost_found/Lost_Found/src/controllers/adminController.js)
- Add `handoverItem`: Handles the final physical handover of an item. Updates `claims` with handover details and `items` status to `returned`.

### Routes

#### [MODIFY] [studentRoutes.js](file:///d:/Lost_found/Lost_Found/src/routes/studentRoutes.js)
- Add `POST /report-found` route using `foundReportController.submitFoundReport`.

#### [MODIFY] [adminRoutes.js](file:///d:/Lost_found/Lost_Found/src/routes/adminRoutes.js)
- Add `POST /handover-item` route using `adminController.handoverItem`.
- Add `GET /found-reports` route using `foundReportController.getFoundReportsAdmin`.
- Add `PATCH /update-found-report/:reportId` route using `foundReportController.updateFoundReportStatus`.

### Utilities

#### [MODIFY] [validator.js](file:///d:/Lost_found/Lost_Found/src/utils/validator.js)
- Add Joi validation schemas for:
    - `foundReportSchema`
    - `updateFoundReportSchema`
    - `handoverSchema`

## Open Questions

> [!NOTE]
> - Should we trigger any specific n8n workflow for `handover-item`? Currently, other status updates trigger n8n workflows. I will assume we should notify the user that an item was successfully handed over.

## Verification Plan

### Automated Tests
- I will verify the logic by ensuring the code follows the requested flow and database updates.
- I will test the endpoints using a tool like Postman if possible, or simulate requests if I have a local environment.

### Manual Verification
- Verify that multipart/form-data images are correctly uploaded to Cloudinary.
- Verify that database status transitions work as expected (`lost` -> `found` -> `claimed` -> `returned`).
- Verify that `found_reports` are correctly linked to `items`.

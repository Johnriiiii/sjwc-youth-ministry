import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { SubmissionModel } from '../models/Submission.js';
export const submissionRoutes = express.Router();
const toSafeStatus = (value) => (value === 'Approved' ? 'Approved' : 'Pending');
submissionRoutes.post('/', requireAuth, async (req, res) => {
    const body = req.body;
    const requiredFields = [
        body.fullName,
        body.middleName,
        body.gender,
        body.age,
        body.birthdate,
        body.registrationDate,
        body.contactNumber,
        body.address,
        body.guardianContact,
        body.emergencyContactPerson,
        body.emergencyContactNumber,
        body.photoData,
    ];
    if (requiredFields.some((field) => field === undefined || field === null || field === '')) {
        return res.status(400).json({ message: 'Please complete all required fields' });
    }
    const created = await SubmissionModel.create({
        userId: req.auth?.sub,
        fullName: body.fullName,
        middleName: body.middleName,
        gender: body.gender,
        age: Number(body.age),
        birthdate: body.birthdate,
        registrationDate: body.registrationDate,
        contactNumber: body.contactNumber,
        address: body.address,
        guardianContact: body.guardianContact,
        emergencyContactPerson: body.emergencyContactPerson,
        emergencyContactNumber: body.emergencyContactNumber,
        photoData: body.photoData,
        photoName: body.photoName ?? '',
        status: 'Pending',
    });
    return res.status(201).json({
        submission: {
            ...created.toObject(),
            id: created._id.toString(),
        },
    });
});
submissionRoutes.get('/mine', requireAuth, async (req, res) => {
    const records = await SubmissionModel.find({ userId: req.auth?.sub })
        .sort({ createdAt: -1 })
        .lean();
    return res.json({
        submissions: records.map((item) => ({
            ...item,
            id: item._id.toString(),
            status: toSafeStatus(item.status),
        })),
    });
});

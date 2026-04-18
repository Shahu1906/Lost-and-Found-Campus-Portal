const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match'
    }),
    reg_id: Joi.string().required(),
    full_name: Joi.string().required(),
    dob: Joi.date().iso().required(),
    dept: Joi.string().required(),
    div: Joi.string().optional(),
    role: Joi.string().valid('student').default('student')
});

const postSchema = Joi.object({
    type: Joi.string().valid('lost', 'found').required(),
    category: Joi.string().valid('electronics', 'jewelry', 'keys', 'others').required(),
    item_name: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    geotag_lat: Joi.number().optional().allow(''),
    geotag_lng: Joi.number().optional().allow(''),
    image_data: Joi.string().optional().allow(''),
    lost_date: Joi.date().iso().optional().allow('')
});

const claimSchema = Joi.object({
    item_id: Joi.number().required(),
    proof_type: Joi.string().valid('bill', 'photo', 'in_person_meet').required(),
    proof_details: Joi.string().optional().allow('') // Optional because the file might be sent via multer form-data
});

module.exports = {
    registerSchema,
    postSchema,
    claimSchema
};

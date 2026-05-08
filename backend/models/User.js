const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        validate: {
            validator: function (v) {
                return /^[a-zA-Z\s]+$/.test(v);
            },
            message: props => `${props.value} is not a valid name! Name should only contain letters and spaces.`
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function (v) {
                // Remove optional +91 prefix for validation, or enforce exactly 10 digits
                const clean = v.replace(/^\+91\s?/, '').replace(/\D/g, '');
                return /^\d{10}$/.test(clean);
            },
            message: props => `${props.value} is not a valid phone number! Must be exactly 10 digits.`
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        validate: {
            validator: function (v) {
                // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(v);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        }
    },
    role: {
        type: String,
        enum: ['citizen', 'authority', 'admin'],
        default: 'citizen'
    },
    department: {
        type: String,
        required: function () { return this.role === 'authority'; }
    },
    avatar: String,
    points: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    // Safety check: Don't hash if already hashed (bcrypt hashes start with $2)
    if (this.password.startsWith('$2')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = userSchema;

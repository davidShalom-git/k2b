const mongoose = require('mongoose')

const WaiterSchema = new mongoose.Schema({
    Username: {
        type: String,
        required: true
    },
    Password: {
        type: String,
        required: true
    }
})

const waiter = mongoose.model('waiter', WaiterSchema)

module.exports = waiter;
const mongoose = require('mongoose');
const User = require('./user.model');
const Client = require('../clients/client.model');
const Bill = require('../bills/bill.model');

const getTransferPreview = async (req, res) => {
  try {
    const { fromUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fromUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const fromUser = await User.findById(fromUserId);
    if (!fromUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const clientCount = await Client.countDocuments({ createdBy: fromUserId });
    const bills = await Bill.find({ createdBy: fromUserId }).select('amount');
    const billCount = bills.length;
    const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

    return res.status(200).json({
      success: true,
      clientCount,
      billCount,
      totalAmount,
      fromUser: {
        _id: fromUser._id,
        name: fromUser.name,
        email: fromUser.email,
        role: fromUser.role,
      },
    });
  } catch (error) {
    console.error('Error getting transfer preview:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const transferUserData = async (req, res) => {
  let session;
  try {
    const { fromUserId } = req.params;
    const { toUserId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fromUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid from user ID',
      });
    }
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target user ID',
      });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer data to the same user',
      });
    }

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user is required',
      });
    }

    const fromUser = await User.findById(fromUserId);
    if (!fromUser) {
      return res.status(404).json({
        success: false,
        message: 'Source user not found',
      });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    if (!toUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Target user must be active',
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const clientResult = await Client.updateMany(
      { createdBy: fromUserId },
      { $set: { createdBy: toUserId } },
      { session }
    );

    const billCreatedResult = await Bill.updateMany(
      { createdBy: fromUserId },
      { $set: { createdBy: toUserId } },
      { session }
    );

    const billApprovedResult = await Bill.updateMany(
      { approvedBy: fromUserId },
      { $set: { approvedBy: toUserId } },
      { session }
    );

    const billRejectedResult = await Bill.updateMany(
      { rejectedBy: fromUserId },
      { $set: { rejectedBy: toUserId } },
      { session }
    );

    const transferredClients = clientResult.modifiedCount;
    const transferredBills =
      billCreatedResult.modifiedCount +
      billApprovedResult.modifiedCount +
      billRejectedResult.modifiedCount;

    await User.updateOne(
      { _id: fromUserId },
      { $set: { isActive: false } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      transferredClients,
      transferredBills,
      message: 'Data transferred and user deactivated successfully',
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error('Error aborting transaction:', abortErr);
      }
      session.endSession();
    }
    console.error('Error transferring user data:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getTransferPreview,
  transferUserData,
};

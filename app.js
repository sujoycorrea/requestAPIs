const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const lodash = require("lodash");
const cors = require("cors");
const port = 9000;

const {
  default: mongoose,
  Schema,
  Collection,
  Model,
  model,
} = require("mongoose");
const { ObjectId } = require("mongoose").Types;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// =======================DB STUFF=========================

// ++++ Creating the DB +++++++
mongoose.connect("mongodb://127.0.0.1:27017/requestApi");

//++++++ Creating the Schema +++++
const contactSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide email id"],
  },
  name: {
    type: String,
    required: [true, "Please provide a name"],
  },
  phone: {
    type: Number,
    required: false,
  },
});

const requestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    required: [
      true,
      "Please provide request type. And make sure it matches the allowed of Ticket' or Service Request",
    ],
    enum: ["Ticket", "Service Request"],
  },
  contactId: {
    type: ObjectId,
    required: [true, "Please provide the contact id"],
  },

  TickorReqId: {
    type: String,
    required: [true, "Please provide the Ticket or Request Id"],
  },
});

const ticketDetailSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, "Please provide a subject"],
  },
  description: {
    type: String,
    required: false,
  },
  contactId: {
    type: ObjectId,
    required: [true, "please provide the contact id"],
  },
  AgentId: {
    type: ObjectId,
    required: false,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    required: false,
  },
});

const commSchema = new mongoose.Schema({
  TickorReqId: {
    type: ObjectId,
    required: [true, "Please provide the ticket or request id"],
  },
  messages: [],
});

//++++++ Creating the Collections/Model +++++++

const Contact = new mongoose.model("contact", contactSchema);
const Request = new mongoose.model("request", requestSchema);
const TicketDetail = new mongoose.model("ticketDetail", ticketDetailSchema);
const Comms = new mongoose.model("comms", commSchema);

//=================== App Logic ===========================

//+++++++ Contact API logic ==========================
app
  .route("/requestApi/v1/contact")

  .post(async function (req, res) {
    const contactEmail = req.body.email;
    const contactName = req.body.name;
    const contactPhone = req.body.phone;

    const newContact = new Contact({
      email: contactEmail,
      name: contactName,
      phone: contactPhone,
    });

    try {
      //Check if email already exists
      const checkData = await Contact.findOne({ email: contactEmail });
      console.log(checkData);
      if (checkData)
        return res.status(404).json({
          success: false,
          data: `A user with this email id already exists`,
        });

      //If email does not exist save the contact
      const theData = await newContact.save();
      console.log("TRUE - POST for contact API worked");
      return res.status(200).json({ success: true, data: theData });
    } catch (error) {
      console.log("FALSE - issue with POST for contact API");
      console.log(error);
      return res.status(400).json({ success: false, data: error });
    }
  })

  .get(async function (req, res) {
    try {
      const theData = await Contact.find();
      console.log("TRUE - GET for contact API worked");
      return res.status(200).json({ success: true, data: theData });
    } catch (error) {
      console.log("FALSE - issue with Get for contact API");
      console.log(error);
      return res.status(400).json({ success: false, data: error });
    }
  });

app.get("/requestApi/v1/contact/:email", async function (req, res) {
  const theEmailId = req.params.email;

  try {
    const theData = await Contact.findOne({ email: theEmailId });

    console.log("TRUE - GET for contact API with contact email worked");
    return res.status(200).json({ success: true, data: theData });
  } catch (error) {
    console.log("FALSE - issue with the the contact GET using email");
    console.log(error);

    return res.status(400).json({ success: false, data: error });
  }
});

// ++++++++ Ticket Details API logic +++++++++++

app
  .route("/requestApi/v1/ticket")

  .post(async function (req, res) {
    const theSubject = req.body.subject;
    const theDescription = req.body.description;
    const theContactId = req.body.contactId;
    const theAgendId = req.body.agentId;
    const thePriority = req.body.priority;

    const newTicket = new TicketDetail({
      subject: theSubject,
      description: theDescription,
      contactId: theContactId,
      agentId: theAgendId,
      priority: thePriority,
    });

    try {
      const theData = await newTicket.save();
      console.log("TRUE - POST of ticket API worked");

      const newRequest = new Request({
        requestType: "Ticket",
        contactId: theContactId,
        TickorReqId: theData._id,
      });

      await newRequest.save();

      const newComms = new Comms({
        TickorReqId: theData._id,
        messages: [],
      });

      await newComms.save();

      return res.status(200).json({ success: true, data: theData });
    } catch (error) {
      console.log("FALSE - issue with POST of ticket API");
      console.log(error);

      return res.status(400).json({ success: false, data: error });
    }
  })

  .get(async function (req, res) {
    try {
      const theData = await TicketDetail.find();
      console.log("TRUE - GET of ticket API worked");

      return res.status(200).json({ success: true, data: theData });
    } catch (error) {
      console.log("FALSE - GET of ticket API failed");
      console.log(error);

      return res.status(400).json({ success: false, data: error });
    }
  });

app.get("/requestApi/v1/ticket/:ticketId", async function (req, res) {
  const theTicketId = req.params.ticketId;

  try {
    const theData = await TicketDetail.findOne({ _id: theTicketId });
    console.log("TRUE - GET of ticket api w/ Request ID worked");

    return res.status(200).json({ success: true, data: theData });
  } catch (error) {
    console.log("FALSE - GET of ticket api w/ Request ID failed");
    console.log(error);

    return res.status(400).json({ success: false, data: error });
  }
});

app.delete("/requestApi/v1/ticket/:ticketId", async function (req, res) {
  const theTicketId = req.params.ticketId;

  try {
    await TicketDetail.deleteOne({ _id: theTicketId });
    await Request.deleteOne({ TickorReqId: theTicketId });

    console.log("TRUE - delete for ticketDetails API worked");
    res
      .status(200)
      .json({ sucess: true, data: `Ticket id ${theTicketId} is deleted` });
  } catch (error) {
    console.log("FALSE - issue with delete for tikectDetail API");
    console.log(error);
    res.status(400).json({ success: false, data: error });
  }
});

app.get("/requestApi/v1/userTickets/:contactId", async function (req, res) {
  const theContactId = req.params.contactId;

  try {
    const theData = await TicketDetail.find({ contactId: theContactId });

    console.log("TRUE - API of Get tickets w/ contactID worked");

    return res.status(200).json({ success: true, data: theData });
  } catch (error) {
    console.log("FALSE - issue with API of Get Tickets w/ contactId");
    console.log(error);
    return res.status(400).json({ success: false, data: error });
  }
});

// +++++++++ Request API Logic +++++++++++

app.get("/requestApi/v1/request/:contactId", async function (req, res) {
  const theContactId = req.params.contactId;

  try {
    const theData = await Request.find({ contactId: theContactId });
    console.log("TRUE- GET of request API w/ contact ID worked");

    res.status(200).json({ success: true, data: theData });
  } catch (error) {
    console.log("FALSE- GET of request API w/ contact ID failed");
    console.log(error);
    res.status(400).json({ success: false, data: error });
  }
});

app.get("/requestApi/v1/request", async function (req, res) {
  try {
    const theData = await Request.find();
    console.log("TRUE - GET all the requests of request API worked");

    res.status(200).json({ success: true, data: theData });
  } catch (error) {
    console.log("FALSE- GET all the requests of request API failed");
    console.log(error);
    res.status(400).json({ success: false, data: error });
  }
});

// ++++++++++ Comms API logic +++++++++++++++++

app
  .route("/requestApi/v1/comms/:ticketId")

  .post(async function (req, res) {
    const theTicketId = req.params.ticketId;
    let theSenderName;
    const theSenderId = req.body.senderId;
    let theTimeStamp = new Date();
    const theMessage = req.body.message;

    try {
      console.log(theSenderId);
      const theData2 = await Contact.findOne({ _id: theSenderId });
      // console.log(theData2);
      theSenderName = theData2.name;

      const theFinalPayload = {
        ticketId: theTicketId,
        senderName: theSenderName,
        sendId: theSenderId,
        timeStamp: theTimeStamp,
        message: theMessage,
      };

      const theData3 = await Comms.updateOne(
        { TickorReqId: theTicketId },
        { $push: { messages: theFinalPayload } }
      );
      console.log("TRUE - Post for comms API worked");

      res.status(200).json({ success: true, data: theData3 });
    } catch (error) {
      console.log("FALSE- Issue with Post for comms logic");
      console.log(error);
      res.status(400).json({ success: false, data: error });
    }
  })

  .get(async function (req, res) {
    const theTicketId = req.params.ticketId;

    try {
      const theData = await Comms.findOne({ TickorReqId: theTicketId });

      console.log("TRUE - GET for comms API worked");

      res.status(200).json({ success: true, data: theData });
    } catch (error) {
      console.log("FALSE - Issue with the get for comms API");
      console.log(error);

      res.status(400).json({ success: false, data: error });
    }
  });

// LISTENING
app.listen(port, function () {
  console.log(`Port number ${port} is fired up`);
});

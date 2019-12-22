const express = require('express');
const cors = require('cors');
const mysql = require("mysql");
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

const corsConfig = {
    origin: ['https://brad-quiz.herokuapp.com', 'http://localhost:3001', 'http://localhost:3000']
}

app.use(cors(corsConfig));
app.use(bodyParser.json())
cors({ redentials: true, origin: true });


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


app.post('/register', (req,res,next) => {
    console.log("registering");
    let {email, password} = req.body;
    if (!email || !password) {
        return res.status(404).send('Please type email and password');
    }
    const findUserQuery = `SELECT * FROM users u WHERE u.name = '${email}'`;
    connection.query(findUserQuery, (error, results, fields) => {
        if (error) {
            res.json(["An error occurred while connecting to the database."]);
            throw error;
        }
        if (results.length !== 0){
            bcrypt.compare(password, results[0].password, (err, isMatch) => {
                if (isMatch) {
                    return res.json(results);
                } else {
                    return res.json("Wrong password!");
                }
            });
            return;
        }
        else{
            //register user
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(password, salt, (err, hash) => {
                    password = hash;
                    const insertQuery = `INSERT INTO users (name,password,highscore) VALUES ('${email}', '${password}', 0)`;
                    connection.query(insertQuery, (error, results, fields) => {
                        if (error) {
                            res.json(["An error occurred while connecting to the database."]);
                            throw error;
                        }
                        return;
                    });
                    const findUserQuery = `SELECT * FROM users u WHERE u.name = '${email}'`;
                    connection.query(findUserQuery, (error, results, fields) => {
                        if (error) {
                            res.json(["An error occurred while connecting to the database."]);
                            throw error;
                        }
                        res.json(results);
                        return;
                    })
                });
            });
        }
    });
    
});

app.post('/get-question', (req, res, next) => {
    const {id} = req.body;
    const getQuestionQuery = `SELECT Q.*
        FROM questionsbank Q
        LEFT JOIN answers A
            ON Q.QuestionID = A.QuestionID
            AND A.userID = ${id}
        WHERE A.QuestionID is NULL
        ORDER BY RAND()
        LIMIT 1`;
    connection.query(getQuestionQuery, (error, results, fields) => {
        if (error) {
            res.json(["An error occurred while connecting to the database."]);
            throw error;
        }
        res.json(results);
        return;

    });
});

app.post('/answer', (req, res, next) => {
    const {QuestionID,id} = req.body;
    const questionQuery = `SELECT RightAnswer FROM questionsbank Where QuestionID = ${QuestionID}`
    let answers = Object.keys(req.body);
    if (answers.filter(answer => req.body[answer] === 'false').length === answers.length - 1){
        res.json("Please select an answer");
        return;
    }
    answers = answers.filter(answer => req.body[answer] === 'true');
    let finalAnswer = answers[answers.length-1];
    finalAnswer = finalAnswer.slice(3, finalAnswer.length);
    connection.query(questionQuery, (error, results, fields) => {
        if (error) {
            res.json(["An error occurred while connecting to the database."]);
            throw error;
        }
        if (finalAnswer === results[0].RightAnswer){
            const insertAnswerQuery = `INSERT INTO answers (QuestionID,UserID,Answer) VALUES (${QuestionID}, ${id}, '${finalAnswer}');`
            connection.query(insertAnswerQuery, (error, results, fields) => {
                res.json("Correct!");
                req.body = {};
                return;
            });
        }        
        else{
            res.json("Incorrect!");
            return;
        }
    });
});

app.delete('/truncate', (req,res,next) => {
    const truncateQuery = `TRUNCATE TABLE answers`;
    connection.query(truncateQuery);
});

connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('server started on port ' + PORT))
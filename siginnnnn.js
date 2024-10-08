router.post('/signin', (req, res) => {
    //   const email = req.body.email;
    //   const password = req.body.password;
    
    //   // Extract domain from email
    //   const emailDomain = email.split('@')[1];
    //   console.log(`Signin attempt - Email: ${email}, Domain: ${emailDomain}`);
    
    //   // Check if the email domain is in the list of valid services
    //   if (!validEmailServices.includes(emailDomain)) {
    //     console.log('Invalid email service');
    //     return res.status(400).send('Invalid email: Email service is not supported');
    //   }
    
    //   const checkLoginQuery = `SELECT id, Password FROM Users WHERE Email = '${email}'`;
    //   console.log('Query:', checkLoginQuery);
    
    //   const loginRequest = new Request(checkLoginQuery, (err, rowCount) => {
    //     if (err) {
    //       console.error('Error checking login:', err);
    //       return res.status(500).send('Server error. Please try again later.');
    //     }
    
    //     if (rowCount === 0) {
    //       console.log('No matching email found');
    //       return res.status(400).send('Invalid email or password');
    //     }
    //   });
    
    //   let storedHashedPassword = null;
    //   let userId = null;
    
    //   loginRequest.on('row', columns => {
    //     columns.forEach(column => {
    //       if (column.metadata.colName === 'Password') {
    //         storedHashedPassword = column.value;
    //         console.log(`Retrieved stored hashed password: ${storedHashedPassword}`);
    //       }
    //       if (column.metadata.colName === 'id') { // Use the correct column name
    //         userId = column.value;
    //         console.log(`Retrieved user ID: ${userId}`);
    //       }
    //     });
    //   });
    
    //   loginRequest.on('requestCompleted', () => {
    //     if (storedHashedPassword) {
    //       const hashedPassword = hashPassword(password);
    //       if (hashedPassword === storedHashedPassword) {
    //         console.log('Signin successful');
    //         req.session.userId = userId; // Store user ID in session
    //         return res.redirect('/profile');  // Redirect to profile page
    //       } else {
    //         console.log('Password mismatch');
    //         return res.status(400).send('Invalid email or password');
    //       }
    //     }
    //   });
    
    //   connection.execSql(loginRequest);
    // });

    



















    // router.post('/profile', (req, res) => {
    //     const userId = req.session.userId; // Assuming you have user session management
    //     const { fullName, dob, country, city, address, phoneNo, bio } = req.body;
      
    //     if (!userId) {
    //       return res.status(401).json({ success: false, message: 'User not authenticated' });
    //     }
      
    //     const insertProfileQuery = `
    //       INSERT INTO Profiles (UserId, Name, DateOfBirth, Country, City, Address, PhoneNo, Bio)
    //       VALUES (@UserId, @Name, @DateOfBirth, @Country, @City, @Address, @PhoneNo, @Bio)
    //     `;
      
    //     const request = new Request(insertProfileQuery, (err) => {
    //       if (err) {
    //         console.error('Error inserting profile data:', err);
    //         return res.status(500).json({ success: false, message: 'Error saving profile data' });
    //       } else {
    //         console.log('Profile saved successfully.');
    //         res.status(200).json({ success: true, message: 'Profile saved successfully' });
    //       }
    //     });
      
    //     request.addParameter('UserId', TYPES.Int, userId);
    //     request.addParameter('Name', TYPES.NVarChar, fullName);
    //     request.addParameter('DateOfBirth', TYPES.Date, dob);
    //     request.addParameter('Country', TYPES.NVarChar, country);
    //     request.addParameter('City', TYPES.NVarChar, city);
    //     request.addParameter('Address', TYPES.NVarChar, address);
    //     request.addParameter('PhoneNo', TYPES.NVarChar, phoneNo);
    //     request.addParameter('Bio', TYPES.NVarChar, bio);
      
    //     connection.execSql(request);
    //   });






    //   router.post('/profile', (req, res) => {
    //     const { fullName, dob, country, city, address, phoneNo, bio } = req.body;
      
    //     const insertProfileQuery = `
    //       INSERT INTO Profiles (fullName, dob, country, city, address, phoneNo, bio)
    //       VALUES ('${fullName}', '${dob}', '${country}', '${city}', '${address}', '${phoneNo}', '${bio}')
    //     `;
      
    //     const insertRequest = new Request(insertProfileQuery, (err) => {
    //       if (err) {
    //         console.error('Error inserting profile data:', err);
    //         return res.status(500).send({ success: false, message: 'Error saving profile data.' });
    //       } else {
    //         console.log('Profile data saved successfully.');
    //         res.status(200).send({ success: true, message: 'Profile saved successfully.' });
    //       }
    //     });
      
    //     connection.execSql(insertRequest);
    //   });
      
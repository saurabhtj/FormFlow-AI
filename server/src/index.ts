import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { adminDb, adminAuth } from './firebase';
import { encrypt, decrypt } from './utils/crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FormFlow AI backend is running successfully!' });
});

app.get('/api/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user.uid;
    const doc = await adminDb.collection('profiles').doc(uid).get();
    if (!doc.exists) {
      res.json({});
      return;
    }
    const data = doc.data() as any;
    const decryptedProfile = {
      ...data,
      aadhaar: decrypt(data.aadhaar || ''),
      pan: decrypt(data.pan || '')
    };
    res.json(decryptedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user.uid;
    const { fullName, dob, address, phone, aadhaar, pan } = req.body;
    
    const encryptedProfile = {
      fullName,
      dob,
      address,
      phone,
      aadhaar: encrypt(aadhaar || ''),
      pan: encrypt(pan || ''),
      updatedAt: new Date()
    };
    
    await adminDb.collection('profiles').doc(uid).set(encryptedProfile, { merge: true });
    res.json({ success: true, message: 'Profile saved and encrypted securely' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Process Image and return AI-mapped fields
app.post('/api/fill-form', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user.uid;
    const { base64Data, mimeType } = req.body;
    
    if (!base64Data || !mimeType) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    // Fetch and decrypt user profile securely from backend
    const doc = await adminDb.collection('profiles').doc(uid).get();
    if (!doc.exists) {
       res.status(404).json({ error: 'Profile not found. Please fill your Vault first.' });
       return;
    }
    
    const data = doc.data() as any;
    const decryptedProfile = {
      fullName: data.fullName,
      dob: data.dob,
      address: data.address,
      phone: data.phone,
      aadhaar: decrypt(data.aadhaar || ''),
      pan: decrypt(data.pan || '')
    };

    // Call Gemini to map fields
    const { mapFormFieldsWithGemini } = await import('./utils/ai');
    const mappedData = await mapFormFieldsWithGemini(base64Data, mimeType, decryptedProfile);

    res.json({ success: true, mappings: mappedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process AI mapping' });
  }
});

const checkAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.user && req.user.admin === true) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
};

app.get('/api/admin/users', authenticate, checkAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const listUsersResult = await adminAuth.listUsers(1000);
    const users = listUsersResult.users.map(u => ({
      uid: u.uid,
      email: u.email,
      creationTime: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime,
    }));

    const profilesSnapshot = await adminDb.collection('profiles').get();
    const profilesMap = new Map();
    
    profilesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      profilesMap.set(doc.id, {
        fullName: data.fullName,
        dob: data.dob,
        phone: data.phone,
        address: data.address,
        aadhaar: decrypt(data.aadhaar || ''),
        pan: decrypt(data.pan || ''),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
      });
    });

    const enrichedUsers = users.map(u => ({
      ...u,
      profile: profilesMap.get(u.uid) || null
    }));

    res.json(enrichedUsers);
  } catch (error) {
    console.error('Failed to list admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Removed StoryForge Game dependencies to allow FormFlow to run cleanly
const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`🚀 FormFlow Server is running on port ${PORT}`);
  });
};

startServer();

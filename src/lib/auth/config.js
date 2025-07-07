import GoogleProvider from 'next-auth/providers/google';
import { dbGetUserPermissions, dbCheckUserExists } from './user';

const SECOND = 60;
const MINUTE = 60 * SECOND;
const HOUR  = 60 * MINUTE;
const DAY = 24 * HOUR;

const SECOND_MS = 60 * 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS  = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const authConfig = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    ],

    secret: process.env.NEXTAUTH_SECRET,

    session: {
        strategy: 'jwt',
        maxAge: 7 * DAY
    },

    callbacks: {
        async jwt({ token, account, user }) {
            if (account && user) {
                token.email = user.email;
                token.name = user.name;
                token.image = user.image;
                token.permissions = await dbGetUserPermissions(user.email);
                token.accessTokenExpires = Date.now() + (5 * MINUTE_MS)
            }

            if (Date.now() < (parseInt(token.accessTokenExpires, 10))) {
                return token;
            }

            const permissions = await dbGetUserPermissions(user.email);
            const expiry = Date.now() + (5 * MINUTE_MS);

            return {
                ...token,
                permissions: permissions,
                accessTokenExpires: expiry
            };
        },

        async session({ session, token }) {
            session.email = token.email;
            session.name = token.name;
            session.image = token.image;
            return session;
        },

        async signIn({ account, profile }) {
            if (account.provider === "google") {
                const userExists = await dbCheckUserExists(profile.email);
                return userExists;
            }
            return true;
        },
    },

    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true,
            },
        },
    },
};


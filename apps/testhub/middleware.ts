import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;
      // Allow results, detailed analysis, and AI guidance to be reviewed without forcing re-login
      if (
        pathname.includes('/results') ||
        pathname.includes('/detailed-analysis') ||
        pathname.includes('/ai-guidance') ||
        pathname.includes('/submit-confirmation')
      ) {
        return true;
      }
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    '/exam/:path*',
  ],
};

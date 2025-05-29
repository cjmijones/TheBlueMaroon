// // src/hooks/useWalletAuth.ts
// import { useAuth0 } from "@auth0/auth0-react";

// export const useWalletAuth = () => {
//   const { loginWithPopup, isAuthenticated, user, logout } = useAuth0();

//   const loginWithEthereum = () =>
//     loginWithPopup({
//       authorizationParams: {
//         connection: "siwe",
//         scope: "openid profile email",
//         prompt: "login",
//       },
//     });

//   return { loginWithEthereum, isAuthenticated, user, logout };
// };

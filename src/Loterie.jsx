import { useState, useEffect } from "react";
import { ethers } from "ethers";

const contractAddress = "0xdf06c3B2B27eff7AC7d238a883724dE1Be988005";
const contractABI = [
  "function participer() external",
  "function tirerGagnant() external",
  "function getParticipants() external view returns(address[])",
];

// RPC public Base Mainnet fiable
const BASE_RPC = "https://mainnet.base.org";

// Adresse du propriétaire (déployeur)
const OWNER_ADDRESS = "0xE5d49eca38466FF0Bd7c66Bad16f787Ad0957816";

export default function Loterie() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null); // pour Metamask
  const [contract, setContract] = useState(null); // pour Metamask
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);
  const [owner, setOwner] = useState(OWNER_ADDRESS);

  // Provider public pour lecture seule
  const publicProvider = new ethers.JsonRpcProvider(BASE_RPC);
  const publicContract = new ethers.Contract(contractAddress, contractABI, publicProvider);

  // Connexion Metamask
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Installe Metamask !");
    try {
      // Switch réseau Base si nécessaire
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x2105",
              chainName: "Base Mainnet",
              rpcUrls: [BASE_RPC],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://basescan.org"],
            },
          ],
        });
      }
    }

    const prov = new ethers.BrowserProvider(window.ethereum);
    await prov.send("eth_requestAccounts", []);
    const signer = await prov.getSigner();
    const addr = await signer.getAddress();

    setAccount(addr);
    setProvider(prov);

    const ctr = new ethers.Contract(contractAddress, contractABI, signer);
    setContract(ctr);
  };

  // Lire participants publiquement
  const loadPlayers = async () => {
    try {
      const list = await publicContract.getParticipants();
      setParticipants(list);
      setWinner(null); // le gagnant est tiré uniquement par l’owner
    } catch (err) {
      console.error("Erreur lecture participants :", err);
    }
  };

  // Participer à la loterie
  const participer = async () => {
    if (!contract) return alert("Connecte Metamask d’abord !");
    const tx = await contract.participer({ gasLimit: 300000 });
    await tx.wait();
    loadPlayers();
  };

  // Tirer le gagnant (seul owner)
  const tirerGagnant = async () => {
    if (!contract) return alert("Connecte Metamask d’abord !");
    const tx = await contract.tirerGagnant({ gasLimit: 300000 });
    await tx.wait();
    loadPlayers();
  };

  // Rafraîchissement automatique participants toutes les 10 secondes
  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        minHeight: "100vh",
        paddingTop: "50px",
        color: "#fff",
        backgroundColor: "#1a1a1a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>🎟️ Loterie Base Mainnet</h1>

      {!account ? (
        <div>
          <p>Connectez Metamask pour participer à la loterie !</p>
          <button onClick={connectWallet}>Connecter Metamask</button>
        </div>
      ) : (
        <div>
          <p>Adresse : {account}</p>
          <button onClick={participer} style={{ marginRight: "10px" }}>
            Participer
          </button>
          {account.toLowerCase() === owner.toLowerCase() && (
            <button onClick={tirerGagnant}>Tirer le gagnant</button>
          )}
        </div>
      )}

      <h3>Participants :</h3>
      {participants.length === 0 ? (
        <p>Aucun participant pour le moment</p>
      ) : (
        <ul>
          {participants.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      {winner && <h2>🎉 Gagnant : {winner}</h2>}
    </div>
  );
}

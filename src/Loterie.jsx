import { useState, useEffect } from "react";
import { ethers } from "ethers";

const contractAddress = "0xdf06c3B2B27eff7AC7d238a883724dE1Be988005";
const contractABI = [
  "function participer() external",
  "function tirerGagnant() external",
  "function getParticipants() external view returns(address[])",
  "event GagnantTire(address winner)"
];

// RPC public Base Mainnet
const BASE_RPC = "https://mainnet.base.org";


const OWNER_ADDRESS = "0x6035158EA3dDa7309259b3F8aF368bebB62d8C52";

export default function Loterie() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);

  const publicProvider = new ethers.JsonRpcProvider(BASE_RPC);
  const publicContract = new ethers.Contract(contractAddress, contractABI, publicProvider);

  // Connexion Metamask
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Installe Metamask !");
    try {
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

  // Déconnexion wallet (réinitialisation UI)
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
  };

  // Lecture publique des participants
  const loadPlayers = async () => {
    try {
      const list = await publicContract.getParticipants();
      setParticipants(list);
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

  useEffect(() => {
    loadPlayers();

    // Rafraîchissement automatique participants
    const interval = setInterval(loadPlayers, 10000);

    // Écoute des événements GagnantTire
    publicContract.on("GagnantTire", (winnerAddress) => {
      setWinner(winnerAddress);
      loadPlayers();
    });

    // Gestion changement de compte Metamask
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          const signer = new ethers.BrowserProvider(window.ethereum).getSigner();
          setContract(new ethers.Contract(contractAddress, contractABI, signer));
        }
      });
    }

    return () => {
      clearInterval(interval);
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", () => {});
      }
      publicContract.removeAllListeners("GagnantTire");
    };
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
          {account.toLowerCase() === OWNER_ADDRESS.toLowerCase() && (
            <button onClick={tirerGagnant} style={{ marginRight: "10px" }}>
              Tirer le gagnant
            </button>
          )}
          <button onClick={disconnectWallet}>Déconnecter le wallet</button>
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

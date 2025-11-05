import { useState, useEffect } from "react";
import { ethers } from "ethers";

const contractAddress = "0xdf06c3B2B27eff7AC7d238a883724dE1Be988005";
const contractABI = [
  "function participer() public",
  "function tirerAuSort() public",
  "function joueurs(uint256) public view returns (address)",
  "function joueursLength() public view returns (uint256)",
  "function gagnant() public view returns (address)",
];

export default function Loterie() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Installe Metamask !");
    const prov = new ethers.BrowserProvider(window.ethereum);
    await prov.send("eth_requestAccounts", []);
    const signer = await prov.getSigner();
    const addr = await signer.getAddress();

    setAccount(addr);
    setProvider(prov);

    const ctr = new ethers.Contract(contractAddress, contractABI, signer);
    setContract(ctr);
  };

  const loadPlayers = async () => {
    if (!contract) return;
    const length = Number(await contract.joueursLength());
    const list = [];
    for (let i = 0; i < length; i++) {
      list.push(await contract.joueurs(i));
    }
    setParticipants(list);
    const w = await contract.gagnant();
    setWinner(w !== "0x0000000000000000000000000000000000000000" ? w : null);
  };

  const participer = async () => {
    if (!contract) return alert("Connecte Metamask d’abord !");
    const tx = await contract.participer({ gasLimit: 300000 });
    await tx.wait();
    loadPlayers();
  };

  const tirerGagnant = async () => {
    if (!contract) return;
    const tx = await contract.tirerAuSort({ gasLimit: 300000 });
    await tx.wait();
    loadPlayers();
  };

  useEffect(() => {
    if (contract) loadPlayers();
  }, [contract]);

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
          <button onClick={tirerGagnant}>Tirer le gagnant</button>
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

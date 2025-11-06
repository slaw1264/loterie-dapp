import { useState, useEffect } from "react";
import { ethers } from "ethers";

const contractAddress = "0xdf06c3B2B27eff7AC7d238a883724dE1Be988005";
const contractABI = [
  "function participer() external",
  "function tirerGagnant() external",
  "function getParticipants() external view returns(address[])",
  "event GagnantTire(address winner)"
];

const BASE_RPC = "https://mainnet.base.org";
const OWNER_ADDRESS = "0x6035158EA3dDa7309259b3F8aF368bebB62d8C52";

export default function Loterie() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isDisconnected, setIsDisconnected] = useState(false);

  const publicProvider = new ethers.JsonRpcProvider(BASE_RPC);
  const publicContract = new ethers.Contract(contractAddress, contractABI, publicProvider);

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
    setIsDisconnected(false);

    const ctr = new ethers.Contract(contractAddress, contractABI, signer);
    setContract(ctr);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setIsDisconnected(true);
  };

  const loadPlayers = async () => {
    try {
      const list = await publicContract.getParticipants();
      setParticipantsCount(list.length);
    } catch (err) {
      console.error("Erreur lecture participants :", err);
    }
  };

  const participer = async () => {
    if (!contract) return alert("Connecte Metamask d’abord !");
    const tx = await contract.participer({ gasLimit: 300000 });
    await tx.wait();
    loadPlayers();
  };

  const tirerGagnant = async () => {
    if (!contract) return alert("Connecte Metamask d’abord !");
    const tx = await contract.tirerGagnant({ gasLimit: 300000 });
    await tx.wait();
    loadPlayers();
  };

  useEffect(() => {
    loadPlayers();

    const interval = setInterval(loadPlayers, 10000);

    publicContract.on("GagnantTire", (winnerAddress) => {
      setWinner(winnerAddress);
      loadPlayers();
    });

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          const signer = new ethers.BrowserProvider(window.ethereum).getSigner();
          setContract(new ethers.Contract(contractAddress, contractABI, signer));
          setIsDisconnected(false);
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
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8 font-sans">
      <h1 className="text-4xl font-bold mb-8">🎟️ Loterie Base Mainnet</h1>

      {!account ? (
        <div className="text-center">
          <p className="mb-4">Connecte ton wallet pour participer à la loterie !</p>
          <button
            onClick={connectWallet}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-lg transition"
          >
            Connecter Metamask
          </button>
        </div>
      ) : (
        <div className="text-center mb-8">
          <p className="mb-2 text-gray-300 break-all">Adresse : {account}</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <button
              onClick={participer}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl shadow-lg transition"
            >
              Participer
            </button>
            {account.toLowerCase() === OWNER_ADDRESS.toLowerCase() && (
              <button
                onClick={tirerGagnant}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-xl shadow-lg transition"
              >
                Tirer le gagnant
              </button>
            )}
            <button
              onClick={disconnectWallet}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-xl shadow-lg transition"
            >
              Déconnecter
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl p-6 shadow-xl w-full max-w-md text-center">
        <h3 className="text-2xl mb-4 font-semibold">Participants</h3>
        <p className="text-lg">
          Nombre de participants :{" "}
          <span className="font-bold text-yellow-400">{participantsCount}</span>
        </p>
      </div>

      {winner && (
        <div className="mt-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-2xl px-6 py-4 shadow-xl text-center">
          <h2 className="text-2xl font-bold">🎉 Gagnant : {winner}</h2>
        </div>
      )}
    </div>
  );
}

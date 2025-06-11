import { copyTextToClipboard } from "@/utils/clipboard";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FaBookmark, FaRegBookmark } from "react-icons/fa6";

const Share: React.FC<{ url: string }> = ({ url }) => {
  const [isCopied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const urlRef = useRef<string>(url);
  const isUpdatedRef = useRef<boolean>(false);

  if (urlRef.current !== url) {
    urlRef.current = url;
    isUpdatedRef.current = true;
  }

  const onClickCopy = () => {
    setTimeout(() => {
      setCopied(false);
    }, 2500);
    copyTextToClipboard(url);
    setCopied(true);
    isUpdatedRef.current = false;
  };

  const buttonText = () => {
    if (isUpdatedRef.current) {
      return (
        <>
          Share
          <FaBookmark width={16} />
        </>
      );
    }
    if (isCopied) {
      return "Copied!";
    }
    return (
      <>
        Share
        <FaRegBookmark width={16} />
      </>
    );
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <div className="">
      <Button
        variant="minimal"
        className="w-28"
        onClick={() => setShowModal(true)}
      >
        {buttonText()}
      </Button>
      {showModal && (
        <div className="fixed z-50 inset-0 flex items-center justify-center overflow-hidden">
          <div className="fixed inset-0 transition-opacity">
            <div className="absolute inset-0 bg-black/50"></div>
          </div>

          <div className="text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-background px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-md">
              <h3 className="text-xl leading-6 font-medium mb-4">
                Save this worksheet
              </h3>
              <p className="text-muted-foreground">
                The link to this worksheet contains all your cap table data in
                the URL. If you update it make sure to share the updated link!
              </p>
              <div className="mt-4">
                <input
                  className="flex-1 w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent"
                  onFocus={handleFocus}
                  onChange={() => {}}
                  value={url}
                ></input>
              </div>
            </div>
            <div className="bg-muted px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-md">
              <Button
                type="button"
                variant="default"
                className="w-36 sm:ml-3 sm:text-sm"
                onClick={onClickCopy}
              >
                {isCopied ? "Copied!" : "Copy"}
              </Button>
              <Button
                type="button"
                variant="minimal"
                className="sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setShowModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Share;

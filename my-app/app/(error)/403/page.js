export default function Custom403({ searchParams }) {
    const message = searchParams.message || "You don't have permission to access this page.";
  
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>403 - Forbidden</h1>
        <p>{message}</p>
      </div>
    );
  }